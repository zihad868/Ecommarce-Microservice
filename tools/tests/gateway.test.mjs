import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { createApp, rejectRateLimitedRequest } from '../../edge/api-gateway/dist/app.js';
import {
  createGatewayRateLimiter,
  createGatewayReadiness,
} from '../../edge/api-gateway/dist/protection.js';
import { localTokenVerifier } from '../../edge/api-gateway/dist/tokenVerifier.js';

// The Redis command boundary is simulated; HTTP routing, JWT verification and
// express-rate-limit/RedisStore all run their real implementations.
const redisFixture = () => {
  const state = { unavailable: false, calls: 0, counts: new Map() };
  const redis = {
    call: async (command, ...args) => {
      if (state.unavailable) throw new Error('Redis connection lost: internal details');
      if (command === 'SCRIPT') return 'test-script-sha';
      assert.equal(command, 'EVALSHA');
      const key = args[2];
      const count = (state.counts.get(key) ?? 0) + 1;
      state.counts.set(key, count);
      return [count, 60_000];
    },
    ping: async () => {
      state.calls++;
      if (state.unavailable) throw new Error('Redis unavailable');
      return 'PONG';
    },
  };
  return { state, redis };
};

const limiter = (redis, max = 2, prefix = 'test:') =>
  createGatewayRateLimiter({
    redisClient: redis,
    windowMs: 60_000,
    max,
    prefix,
    handler: rejectRateLimitedRequest,
  });

const gateway = async (t, options = {}, overrides = {}) => {
  const calls = { products: 0, login: 0 };
  const backend = {
    products: async () => {
      calls.products++;
      return { products: [] };
    },
    login: async () => {
      calls.login++;
      return { user: null, tokens: null };
    },
    ...overrides,
  };
  const errors = [];
  const app = createApp(backend, {
    logger: { error: (error) => errors.push(error) },
    ...options,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });
  return { base: `http://127.0.0.1:${server.address().port}`, calls, errors };
};

test('one isolated ingress hop separates client quotas and ignores forged leftmost IPs', async (t) => {
  const { redis } = redisFixture();
  const { base, calls } = await gateway(t, { trustProxyHops: 1, limiter: limiter(redis) });
  const request = (chain) =>
    fetch(`${base}/api/products`, { headers: { 'X-Forwarded-For': chain } });

  assert.equal((await request('192.0.2.10, 203.0.113.10')).status, 200);
  assert.equal((await request('192.0.2.11, 203.0.113.10')).status, 200);
  const blocked = await request('192.0.2.12, 203.0.113.10');
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
  assert.equal((await blocked.json()).error.code, 'HTTP_429');
  assert.equal((await request('203.0.113.11')).status, 200);
  assert.equal(calls.products, 3);
});

test('direct access ignores client-supplied forwarding headers by default', async (t) => {
  const ips = [];
  const { base } = await gateway(t, {
    limiter: (req, _res, next) => {
      ips.push(req.ip);
      next();
    },
  });
  for (const spoof of ['203.0.113.10', '203.0.113.11']) {
    assert.equal(
      (await fetch(`${base}/api/products`, { headers: { 'X-Forwarded-For': spoof } })).status,
      200,
    );
  }
  assert.deepEqual(ips, ['127.0.0.1', '127.0.0.1']);
});

test('two gateway instances share the Redis quota', async (t) => {
  const { redis } = redisFixture();
  const first = await gateway(t, { limiter: limiter(redis) });
  const second = await gateway(t, { limiter: limiter(redis) });
  assert.equal((await fetch(`${first.base}/api/products`)).status, 200);
  assert.equal((await fetch(`${second.base}/api/products`)).status, 200);
  assert.equal((await fetch(`${first.base}/api/products`)).status, 429);
});

test('Redis quota outage returns sanitized 503, blocks the backend and recovers', async (t) => {
  const { redis, state } = redisFixture();
  const { base, calls, errors } = await gateway(t, { limiter: limiter(redis, 10) });
  assert.equal((await fetch(`${base}/api/products`)).status, 200);
  state.unavailable = true;
  const response = await fetch(`${base}/api/products`);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, 'DEPENDENCY_UNAVAILABLE');
  assert.equal(body.error.message, 'Service unavailable');
  assert.ok(body.error.requestId);
  assert.equal(calls.products, 1);
  assert.equal(errors.length, 1);
  state.unavailable = false;
  assert.equal((await fetch(`${base}/api/products`)).status, 200);
});

test('auth limiter enforces its own quota and fails closed on Redis errors', async (t) => {
  const { redis, state } = redisFixture();
  const { base, calls } = await gateway(t, {
    authLimiter: limiter(redis, 1, 'auth:'),
  });
  const login = () =>
    fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'load@example.test', password: 'test-password' }),
    });
  assert.equal((await login()).status, 200);
  assert.equal((await login()).status, 429);
  state.unavailable = true;
  assert.equal((await login()).status, 503);
  assert.equal(calls.login, 1);
});

test('a gateway started during a Redis outage stays closed and can recover', async (t) => {
  const { redis, state } = redisFixture();
  state.unavailable = true;
  const { base, calls } = await gateway(t, { limiter: limiter(redis, 10) });
  assert.equal((await fetch(`${base}/api/products`)).status, 503);
  assert.equal(calls.products, 0);
  state.unavailable = false;
  assert.equal((await fetch(`${base}/api/products`)).status, 200);
});

test('readiness fails on Redis or backend outage while liveness stays healthy', async (t) => {
  const { redis, state } = redisFixture();
  let backendUnavailable = false;
  const backend = {
    ready: async () => {
      if (backendUnavailable) throw new Error('gRPC unavailable');
    },
  };
  const { base } = await gateway(t, { ready: createGatewayReadiness(backend, redis) });
  assert.equal((await fetch(`${base}/health/ready`)).status, 200);
  state.unavailable = true;
  assert.equal((await fetch(`${base}/health/ready`)).status, 503);
  assert.equal((await fetch(`${base}/health/live`)).status, 200);
  state.unavailable = false;
  backendUnavailable = true;
  assert.equal((await fetch(`${base}/health/ready`)).status, 503);
  backendUnavailable = false;
  assert.equal((await fetch(`${base}/health/ready`)).status, 200);
  assert.equal(state.calls, 4);
});

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const issuedAt = Date.now();
const token = (role, options = {}) =>
  jwt.sign({ id: 'user-1', role, issuedAt }, privateKey, {
    algorithm: 'RS256',
    issuer: 'ecommerce-identity',
    audience: 'ecommerce-gateway',
    expiresIn: '5m',
    ...options,
  });

for (const role of ['USER', 'ADMIN']) {
  test(`${role} revocation lookup fails closed and recovers`, async () => {
    let unavailable = true;
    let metric = 0;
    const verify = localTokenVerifier(
      publicKey,
      {
        get: async (key) => {
          assert.equal(key, 'auth:revoked-before:user-1');
          if (unavailable) throw new Error('Redis unavailable');
          return null;
        },
      },
      { inc: () => metric++ },
    );
    const signed = token(role);
    await assert.rejects(verify(signed), { statusCode: 503, code: 'DEPENDENCY_UNAVAILABLE' });
    assert.equal(metric, 1);
    unavailable = false;
    assert.equal((await verify(signed)).valid, true);
  });
}

test('revoked and expired tokens remain unauthorized', async () => {
  const verify = localTokenVerifier(publicKey, { get: async () => String(issuedAt) });
  await assert.rejects(verify(token('USER')), { statusCode: 401 });
  await assert.rejects(verify(token('USER', { expiresIn: -1 })), { statusCode: 401 });
});

test('invalid JWT claims/signatures never trigger a revocation lookup', async () => {
  let lookups = 0;
  const verify = localTokenVerifier(publicKey, {
    get: async () => {
      lookups++;
      return null;
    },
  });
  for (const invalid of [
    token('USER', { issuer: 'wrong' }),
    token('USER', { audience: 'wrong' }),
    token('OWNER'),
    jwt.sign({ id: 'user-1' }, 'wrong-key'),
  ]) {
    await assert.rejects(verify(invalid), { statusCode: 401 });
  }
  assert.equal(lookups, 0);
});
