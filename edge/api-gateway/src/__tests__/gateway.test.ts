import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Metadata, status, Server as GrpcServer, ServerCredentials } from '@grpc/grpc-js';
import type { AuthV2ServiceHandlers } from '@ecommerce/proto-gen';
import { loadAuthV2 } from '@ecommerce/proto-gen';
import { createBackend } from '../backend';
import type { GatewayBackend } from '../backend';
import { createLogger } from '@ecommerce/observability';
import { InsufficientStockError, toGrpcError, fromGrpcError, DomainError } from '@ecommerce/errors';
import { createApp } from '../app';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

function backend(): GatewayBackend {
  return {
    logout: vi.fn(),
    me: vi.fn(),
    createOrder: vi.fn(),
    payOrder: vi.fn(),
    updateOrder: vi.fn(),
    products: vi.fn(),
    mutateProduct: vi.fn(),
    validateToken: vi
      .fn()
      .mockResolvedValue({ valid: true, userId: 'alice', role: 'USER', error: '' }),
    login: vi.fn().mockResolvedValue({
      user: { id: 'alice', email: 'alice@example.com', role: 'USER' },
      tokens: { accessToken: 'token', refreshToken: 'refresh' },
    }),
    register: vi.fn(),
    refresh: vi.fn(),
    product: vi.fn().mockResolvedValue({ id: 'prod-1', name: 'Product 1', stock: 10 }),
    order: vi.fn().mockResolvedValue({
      id: 'order-1',
      userId: 'bob',
      total: { amount_minor: '1000', currency: 'USD' },
      items: [],
      status: 'PENDING',
    }),
    orders: vi.fn().mockResolvedValue({ orders: [], nextCursor: '' }),
  };
}

async function listen(client: GatewayBackend): Promise<string> {
  const server = createApp(client, {
    logger: createLogger({ serviceName: 'gateway-test', level: 'silent' }),
  }).listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe('gateway HTTP boundary', () => {
  it.each([
    ['/api/auth/login', '{', 'INVALID_JSON'],
    ['/api/auth/login', '{}', 'VALIDATION_ERROR'],
    ['/missing', undefined, 'ROUTE_NOT_FOUND'],
  ])('returns a structured error for %s', async (path, body, code) => {
    const url = await listen(backend());
    const response = await fetch(
      `${url}${path}`,
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body,
          },
    );
    expect(response.status).toBe(code === 'ROUTE_NOT_FOUND' ? 404 : 400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code, requestId: response.headers.get('x-request-id') },
    });
  });
  it('forwards the generated correlation ID when no header is supplied', async () => {
    const client = backend();
    const url = await listen(client);
    const response = await fetch(`${url}/api/products/prod-1`);
    expect(client.product).toHaveBeenCalled();
    expect(vi.mocked(client.product).mock.calls[0][1].get('x-correlation-id')).toEqual([
      response.headers.get('x-correlation-id'),
    ]);
    expect(response.headers.get('x-correlation-id')).not.toBe('undefined');
  });
  it('preserves stock details through a service hop', async () => {
    const client = backend();
    vi.mocked(client.createOrder).mockRejectedValue(
      toGrpcError(
        fromGrpcError(
          toGrpcError(new InsufficientStockError('Insufficient stock', { available: 1 })),
        ),
      ),
    );
    const url = await listen(client);
    const response = await fetch(`${url}/api/orders`, {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: 'p', quantity: 2 }] }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: 'INSUFFICIENT_STOCK', details: { available: 1 } },
    });
  });
  it('sanitizes direct server failures and keeps unexpected SyntaxErrors as 500', async () => {
    const client = backend();
    const url = await listen(client);
    for (const error of [
      new DomainError('INTERNAL', 'secret', 500, status.INTERNAL, { secret: true }),
      new SyntaxError('bug'),
    ]) {
      vi.mocked(client.product).mockRejectedValue(error);
      const response = await fetch(`${url}/api/products/prod-1`);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        success: false,
        error: {
          code: 'INTERNAL',
          message: 'Internal service error',
          requestId: expect.any(String),
        },
      });
    }
  });
  it('forwards order creation and the idempotency key with verified identity metadata', async () => {
    const client = backend();
    vi.mocked(client.createOrder).mockResolvedValue({
      id: 'new',
      userId: 'alice',
      total: { amount_minor: '1000', currency: 'USD' },
      items: [],
      status: 'PENDING',
    });
    const url = await listen(client);
    const response = await fetch(`${url}/api/orders`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
        'idempotency-key': 'retry-1',
        'x-user-id': 'bob',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({ items: [{ productId: 'stock', quantity: 1 }] }),
    });
    expect(response.status).toBe(201);
    const call = vi.mocked(client.createOrder).mock.calls[0];
    expect(call[1]).toBe('retry-1');
    expect(call[2].get('x-user-id')).toEqual(['alice']);
    expect(call[2].get('x-user-role')).toEqual(['USER']);
  });
  it('preserves the idempotency mismatch status and message', async () => {
    const client = backend();
    vi.mocked(client.createOrder).mockRejectedValue({
      code: status.FAILED_PRECONDITION,
      details: 'Idempotency key reused with a different request',
    });
    const url = await listen(client);
    const response = await fetch(`${url}/api/orders`, {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: 'stock', quantity: 1 }] }),
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: 'UPSTREAM_ERROR',
        message: 'Idempotency key reused with a different request',
        requestId: expect.any(String),
      },
    });
  });
  it('routes browsing and payment through their RPC adapters', async () => {
    const client = backend();
    vi.mocked(client.products).mockResolvedValue({ products: [], page: { total: 0 } });
    vi.mocked(client.payOrder).mockResolvedValue({
      id: 'order-1',
      userId: 'alice',
      total: { amount_minor: '1000', currency: 'USD' },
      items: [],
      status: 'PAID',
    });
    const url = await listen(client);
    expect((await fetch(`${url}/api/products?limit=5`)).status).toBe(200);
    expect(client.products).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
      expect.any(Metadata),
    );
    process.env.ENABLE_MOCK_PAYMENTS = 'true';
    try {
      const paid = await fetch(`${url}/api/orders/order-1/pay`, {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
      });
      expect(paid.status).toBe(200);
      expect(client.payOrder).toHaveBeenCalledWith('order-1', 'MOCK', expect.any(Metadata));
    } finally {
      delete process.env.ENABLE_MOCK_PAYMENTS;
    }
  });
  it('gates mock payments with 501 when mock payments are disabled or in production', async () => {
    const client = backend();
    const url = await listen(client);
    // 1. Disabled by default
    delete process.env.ENABLE_MOCK_PAYMENTS;
    const res1 = await fetch(`${url}/api/orders/order-1/pay`, {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
    });
    expect(res1.status).toBe(501);
    expect(await res1.json()).toEqual({
      success: false,
      error: { code: 'HTTP_501', message: 'Internal service error', requestId: expect.any(String) },
    });

    // 2. In production mode even if ENABLE_MOCK_PAYMENTS is true
    process.env.ENABLE_MOCK_PAYMENTS = 'true';
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res2 = await fetch(`${url}/api/orders/order-1/pay`, {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
      });
      expect(res2.status).toBe(501);
    } finally {
      process.env.NODE_ENV = oldEnv;
      delete process.env.ENABLE_MOCK_PAYMENTS;
    }
  });
  it('rejects order reads without authentication before contacting order service', async () => {
    const client = backend();
    const url = await listen(client);
    expect((await fetch(`${url}/api/orders`)).status).toBe(401);
    expect(client.orders).not.toHaveBeenCalled();
  });
  it('hides orders belonging to another customer', async () => {
    const url = await listen(backend());
    expect(
      (await fetch(`${url}/api/orders/order-1`, { headers: { authorization: 'Bearer token' } }))
        .status,
    ).toBe(404);
  });
  it('scopes order queries to the validated identity and forwards correlation metadata', async () => {
    const client = backend();
    const url = await listen(client);
    const response = await fetch(`${url}/api/orders?userId=bob`, {
      headers: { authorization: 'Bearer token', 'x-correlation-id': 'request-123' },
    });
    expect(response.status).toBe(200);
    expect(client.orders).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ limit: 50 }),
      expect.any(Metadata),
    );
    const call = vi.mocked(client.orders).mock.calls[0];
    expect(call[2].get('x-correlation-id')).toEqual(['request-123']);
  });
  it('maps an unreachable identity service to 503', async () => {
    const client = backend();
    vi.mocked(client.validateToken).mockRejectedValue({ code: status.UNAVAILABLE });
    const url = await listen(client);
    expect(
      (await fetch(`${url}/api/orders`, { headers: { authorization: 'Bearer token' } })).status,
    ).toBe(503);
  });
  it('validates credentials before sending them to gRPC', async () => {
    const client = backend();
    const url = await listen(client);
    expect(
      (
        await fetch(`${url}/api/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'bad' }),
        })
      ).status,
    ).toBe(400);
    expect(client.login).not.toHaveBeenCalled();
  });
  it('limits repeated public authentication requests', async () => {
    const url = await listen(backend());
    let response: Response | undefined;
    for (let count = 0; count < 31; count++)
      response = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
    expect(response?.status).toBe(429);
    expect(await response?.json()).toMatchObject({
      error: { code: 'HTTP_429', requestId: response?.headers.get('x-request-id') },
    });
  });
});

describe('generated gRPC client integration', () => {
  it('loads versioned contracts and carries credentials and metadata over a real gRPC connection', async () => {
    let correlation: unknown;
    const handlers: AuthV2ServiceHandlers = {
      Logout: (_call, callback) => callback(null, {}),
      GetUser: (_call, callback) => callback({ code: status.UNIMPLEMENTED }),
      Login: (call, callback) => {
        correlation = call.metadata.get('x-correlation-id');
        callback(null, {
          user: { id: 'alice', email: call.request.email, role: 'USER' },
          tokens: { accessToken: 'a', refreshToken: 'r' },
        });
      },
      Register: (_call, callback) => callback({ code: status.UNIMPLEMENTED }),
      Refresh: (_call, callback) => callback({ code: status.UNIMPLEMENTED }),
      ValidateToken: (_call, callback) => callback(null, { userId: 'alice', role: 'USER' }),
    };
    const definition = loadAuthV2().auth.v2.AuthService.service;
    const rpcServer = new GrpcServer();
    rpcServer.addService(definition, handlers);
    const port = await new Promise<number>((resolve, reject) =>
      rpcServer.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, bound) =>
        error ? reject(error) : resolve(bound),
      ),
    );
    const address = `127.0.0.1:${port}`;
    const client = createBackend({ identity: address, catalog: address, order: address });
    try {
      const meta = new Metadata();
      meta.set('x-correlation-id', 'grpc-request');
      const result = await client.login({ email: 'alice@example.com', password: 'secret' }, meta);
      expect(result.user?.email).toBe('alice@example.com');
      expect(correlation).toEqual(['grpc-request']);
    } finally {
      client.close();
      await new Promise<void>((resolve) => rpcServer.tryShutdown(() => resolve()));
    }
  });
});
