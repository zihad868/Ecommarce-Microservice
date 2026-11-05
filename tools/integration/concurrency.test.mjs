import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

vi.mock('../../services/order-service/src/utils/prismaClient', async () => {
  const mod = await import('../../services/order-service/src/generated/client/index.js');
  return { ...mod, default: new mod.PrismaClient({ datasourceUrl: process.env.TEST_ORDER_DATABASE_URL }) };
});
vi.mock('../../services/catalog-service/src/utils/prismaClient', async () => {
  const mod = await import('../../services/catalog-service/src/generated/client/index.js');
  return { ...mod, default: new mod.PrismaClient({ datasourceUrl: process.env.TEST_CATALOG_DATABASE_URL }) };
});
vi.mock('../../services/identity-service/src/utils/prismaClient', async () => {
  const mod = await import('../../services/identity-service/src/generated/client/index.js');
  return { ...mod, default: new mod.PrismaClient({ datasourceUrl: process.env.TEST_IDENTITY_DATABASE_URL }) };
});
vi.mock('../../services/order-service/src/events/kafka', () => ({ getKafkaProducer: () => ({}), publishEvent: vi.fn() }));
vi.mock('../../services/catalog-service/src/utils/redisClient', () => ({ getRedisClient: () => { throw new Error('Redis unavailable'); } }));
vi.mock('../../services/identity-service/src/utils/redisClient', () => ({ getRedisClient: () => ({ setex: vi.fn().mockResolvedValue('OK'), del: vi.fn().mockResolvedValue(1) }) }));
vi.mock('../../services/identity-service/src/config', async () => {
  const { generateKeyPairSync } = await import('node:crypto');
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  return { default: { JWT_PRIVATE_KEY: keys.privateKey, JWT_PUBLIC_KEY: keys.publicKey } };
});
vi.mock('../../services/order-service/src/grpc/grpcClients', async () => {
  const stock = await import('../../services/catalog-service/src/services/stockService');
  const { default: db } = await import('../../services/catalog-service/src/utils/prismaClient');
  return { reserveStock: stock.reserveStock, getProductDetails: async (id) => {
    const product = await db.product.findUniqueOrThrow({ where: { id } });
    return { success: true, ...product, price: Number(product.price), error: '' };
  } };
});
import orders from '../../services/order-service/src/utils/prismaClient';
import catalog from '../../services/catalog-service/src/utils/prismaClient';
import identity from '../../services/identity-service/src/utils/prismaClient';
import { createOrder, payOrder, reconcileReservation, updateOrderStatus } from '../../services/order-service/src/services/orderService';
import { releaseStock, reserveStock } from '../../services/catalog-service/src/services/stockService';
import { processOutboxEvents, maintainOutbox } from '../../services/order-service/src/events/outboxWorker';
import { publishEvent } from '../../services/order-service/src/events/kafka';
import { registerUser, refreshTokens } from '../../services/identity-service/src/services/authService';
import { localTokenVerifier } from '../../edge/api-gateway/src/tokenVerifier';
import jwt from 'jsonwebtoken';

beforeEach(async () => {
  for (const url of [process.env.TEST_ORDER_DATABASE_URL, process.env.TEST_CATALOG_DATABASE_URL, process.env.TEST_IDENTITY_DATABASE_URL]) {
    if (!url || !new URL(url).searchParams.get('schema')?.startsWith('integration_')) throw new Error('Isolated test schemas required');
  }
  await orders.idempotencyRecord.deleteMany(); await orders.outboxEvent.deleteMany(); await orders.order.deleteMany();
  await catalog.outboxEvent.deleteMany(); await catalog.processedEvent.deleteMany(); await catalog.stockReservation.deleteMany(); await catalog.product.deleteMany();
  await identity.refreshToken.deleteMany(); await identity.user.deleteMany();
  vi.mocked(publishEvent).mockReset().mockResolvedValue(undefined);
  await catalog.product.create({ data: { id: 'stock', name: 'Stock', price: '10.00', stock: 10, category: 'test' } });
});
afterAll(async () => { await Promise.all([orders.$disconnect(), catalog.$disconnect(), identity.$disconnect()]); });

describe('PostgreSQL concurrency', () => {
  it('publishes 100 events once with two concurrent workers using SKIP LOCKED', async () => {
    await orders.outboxEvent.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ id: `event-${i}`, aggregateId: `order-${i}`, eventType: 'TestEvent', payload: { i } })) });
    vi.mocked(publishEvent).mockImplementation(async () => { await new Promise((resolve) => setTimeout(resolve, 2)); });
    const worker = async () => { while (await processOutboxEvents(20)) { /* drain batches */ } };
    await Promise.all([worker(), worker()]);
    const keys = vi.mocked(publishEvent).mock.calls.map((call) => call[1]);
    expect(keys).toHaveLength(100); expect(new Set(keys).size).toBe(100);
    expect(await orders.outboxEvent.count({ where: { status: 'PUBLISHED' } })).toBe(100);
  });
  it('continues past poison events and stops retrying at the limit', async () => {
    await orders.outboxEvent.createMany({ data: [
      { id: 'bad', aggregateId: 'bad', eventType: 'TestEvent', payload: {}, retryCount: 7 },
      { id: 'good', aggregateId: 'good', eventType: 'TestEvent', payload: {} },
      { id: 'future', aggregateId: 'future', eventType: 'TestEvent', payload: {}, nextAttemptAt: new Date(Date.now() + 60_000) },
    ] });
    vi.mocked(publishEvent).mockImplementation(async (_topic, key) => { if (key === 'bad') throw new Error('Poison event'); });
    expect(await processOutboxEvents()).toBe(1);
    expect(await orders.outboxEvent.findUnique({ where: { id: 'bad' } })).toMatchObject({ status: 'FAILED', retryCount: 8, lastError: 'Poison event' });
    expect(await processOutboxEvents()).toBe(0);
  });
  it('cleans only published rows older than seven days', async () => {
    await orders.outboxEvent.createMany({ data: [
      { id: 'old', aggregateId: 'a', eventType: 'TestEvent', payload: {}, status: 'PUBLISHED', publishedAt: new Date(Date.now() - 8 * 86400000) },
      { id: 'pending', aggregateId: 'a', eventType: 'TestEvent', payload: {} },
    ] });
    await maintainOutbox(); expect(await orders.outboxEvent.count()).toBe(1);
  });
  it('accepts exactly ten of 100 concurrent orders for ten units', async () => {
    const results = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => createOrder('buyer', [{ productId: 'stock', quantity: 1 }], `key-${i}`)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    expect(await orders.order.count()).toBe(10);
    expect((await catalog.product.findUniqueOrThrow({ where: { id: 'stock' } })).stock).toBe(0);
  }, 60_000);
  it('allows exactly one concurrent payment', async () => {
    const order = await createOrder('buyer', [{ productId: 'stock', quantity: 1 }]);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => payOrder(order.id, 'buyer', 'USER', { paymentMethod: 'MOCK' })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await orders.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');
  });
  it('replays the same response, rejects a different hash, and reserves once', async () => {
    const input = [{ productId: 'stock', quantity: 1 }];
    const [first, replay] = await Promise.all([createOrder('buyer', input, 'same'), createOrder('buyer', input, 'same')]);
    expect(replay).toEqual(first);
    await expect(createOrder('buyer', [{ productId: 'stock', quantity: 2 }], 'same')).rejects.toMatchObject({ statusCode: 422 });
    expect(await orders.order.count()).toBe(1);
    expect((await catalog.product.findUniqueOrThrow({ where: { id: 'stock' } })).stock).toBe(9);
  });
  it('rolls back all stock when a multi-product reservation fails', async () => {
    await expect(reserveStock('multi', [{ productId: 'stock', quantity: 2 }, { productId: 'missing', quantity: 1 }])).rejects.toThrow();
    expect((await catalog.product.findUniqueOrThrow({ where: { id: 'stock' } })).stock).toBe(10);
    expect(await catalog.stockReservation.count()).toBe(0);
  });
  it('cancels expired pending orders and releases stock once', async () => {
    const order = await createOrder('buyer', [{ productId: 'stock', quantity: 2 }]);
    await orders.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 16 * 60_000) } });
    expect(await reconcileReservation(order.id)).toEqual({ release: true, commit: false });
    await Promise.all([releaseStock(order.id), releaseStock(order.id)]);
    expect((await catalog.product.findUniqueOrThrow({ where: { id: 'stock' } })).stock).toBe(10);
    await expect(payOrder(order.id, 'buyer', 'USER', { paymentMethod: 'MOCK' })).rejects.toThrow();
  });
  it('payment and cancellation cannot both succeed', async () => {
    const order = await createOrder('buyer', [{ productId: 'stock', quantity: 2 }]);
    const results = await Promise.allSettled([payOrder(order.id, 'buyer', 'USER', { paymentMethod: 'MOCK' }), updateOrderStatus(order.id, { status: 'CANCELLED' }, 'buyer', 'USER')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });
  it('revokes the replacement refresh token when an old token is reused', async () => {
    const session = await registerUser({ email: 'reuse@example.com', password: 'LongPassword123!' });
    const next = await refreshTokens(session.tokens.refreshToken);
    await expect(refreshTokens(session.tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await expect(refreshTokens(next.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
});

it('verifies RS256 locally, rejects revoked tokens, and tolerates Redis failure', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = publicKey.export({ format: 'pem', type: 'spki' }).toString();
  const token = jwt.sign({ id: 'buyer', role: 'USER', issuedAt: Date.now() }, privateKey, { algorithm: 'RS256', expiresIn: '15m', issuer: 'ecommerce-identity', audience: 'ecommerce-gateway' });
  const redis = { get: vi.fn().mockRejectedValue(new Error('Redis unavailable')) };
  expect((await localTokenVerifier(key, redis)(token)).userId).toBe('buyer');
  redis.get.mockResolvedValue(String(Date.now() + 1));
  await expect(localTokenVerifier(key, redis)(token)).rejects.toMatchObject({ statusCode: 401 });
});
