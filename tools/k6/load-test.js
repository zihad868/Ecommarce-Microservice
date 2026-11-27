import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const base = (__ENV.GATEWAY_URL || 'http://localhost:8081').replace(/\/$/, '');
const peak = Number(__ENV.TARGET_RPS || 20);
if (!Number.isInteger(peak) || peak < 3)
  throw new Error('TARGET_RPS must be an integer of at least 3');

const loginRate = Math.max(1, Math.floor(peak * 0.05));
const checkoutRate = Math.max(1, Math.floor(peak * 0.15));

const scenario = (rate, execName) => ({
  executor: 'ramping-arrival-rate',
  exec: execName,
  startRate: Math.max(1, Math.ceil(rate * 0.1)),
  timeUnit: '1s',
  preAllocatedVUs: rate,
  maxVUs: rate * 3,
  stages: [
    { duration: __ENV.WARMUP_DURATION || '30s', target: Math.max(1, Math.ceil(rate * 0.6)) },
    { duration: __ENV.RAMP_DURATION || '30s', target: rate },
    { duration: __ENV.STEADY_DURATION || '2m', target: rate },
    { duration: __ENV.COOLDOWN_DURATION || '15s', target: 0 },
  ],
});

export const options = {
  scenarios: {
    browse: scenario(peak - loginRate - checkoutRate, 'browse'),
    login: scenario(loginRate, 'login'),
    checkout: scenario(checkoutRate, 'checkout'),
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count==0'],
    checks: ['rate==1'],
  },
};
const headers = { 'Content-Type': 'application/json' };

const credentials = () =>
  JSON.stringify({ email: __ENV.LOAD_EMAIL, password: __ENV.LOAD_PASSWORD });

export const setup = () => {
  if (!__ENV.LOAD_EMAIL || !__ENV.LOAD_PASSWORD || !__ENV.PRODUCT_ID)
    throw new Error('Provide LOAD_EMAIL, LOAD_PASSWORD and PRODUCT_ID for seeded test data');

  if (http.get(`${base}/health/ready`).status !== 200)
    throw new Error('Gateway dependencies are not ready');

  const response = http.post(`${base}/api/auth/login`, credentials(), { headers });

  if (response.status !== 200) throw new Error('Test login failed');

  const token = response.json('data.tokens.accessToken');
  if (typeof token !== 'string' || !token) throw new Error('Test login returned no access token');

  return { token, runId: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
};

export const browse = () => {
  const response = http.get(`${base}/api/products?limit=10`, { tags: { name: 'browse' } });
  check(response, { 'browse succeeds': (r) => r.status === 200 });
};

export const login = () => {
  const response = http.post(`${base}/api/auth/login`, credentials(), {
    headers,
    tags: { name: 'login' },
  });
  check(response, { 'login succeeds': (r) => r.status === 200 });
};

export const checkout = (data) => {
  const response = http.post(
    `${base}/api/orders`,
    JSON.stringify({ items: [{ productId: __ENV.PRODUCT_ID, quantity: 1 }] }),
    {
      headers: {
        ...headers,
        Authorization: `Bearer ${data.token}`,
        'Idempotency-Key': `k6-${data.runId}-${exec.scenario.name}-${exec.scenario.iterationInTest}`,
      },
      tags: { name: 'create-order' },
    },
  );
  check(response, { 'order reserved and created': (r) => r.status === 201 });
};
