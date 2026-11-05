import { describe, expect, it, vi } from 'vitest';
import { credentials, Metadata, Server, ServerCredentials } from '@grpc/grpc-js';
import type { Client, ServiceError } from '@grpc/grpc-js';
import { loadOrder, loadOrderV2 } from '@ecommerce/proto-gen';
import { InsufficientStockError } from '@ecommerce/errors';

vi.mock('../services/orderService', () => ({
  getOrderById: vi.fn(),
  getOrders: vi.fn(),
  createOrder: vi.fn(),
  payOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  reconcileReservation: vi.fn(),
}));

import * as orders from '../services/orderService';
import { Prisma } from '../utils/prismaClient';
import { orderHandlers } from '../grpc/handlers/orders';
import { orderV2Handlers } from '../grpc/handlers/ordersV2';

describe('order contract compatibility', () => {
  it('serves v1 and v2 together and preserves domain errors over the wire', async () => {
    const record = {
      id: 'order-1',
      userId: 'alice',
      status: 'PENDING' as const,
      totalAmount: new Prisma.Decimal('19.98'),
      items: [{ productId: 'p1', quantity: 2, price: new Prisma.Decimal('9.99') }],
      idempotencyKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(orders.getOrderById).mockResolvedValue(record);
    vi.mocked(orders.createOrder).mockRejectedValue(
      new InsufficientStockError('Insufficient stock', { available: 1 }),
    );
    const server = new Server();
    server.addService(loadOrder().order.v1.OrderService.service, orderHandlers);
    server.addService(loadOrderV2().order.v2.OrderService.service, orderV2Handlers);
    const port = await new Promise<number>((resolve, reject) =>
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, bound) =>
        error ? reject(error) : resolve(bound),
      ),
    );
    const address = `127.0.0.1:${port}`;
    const v1 = new (loadOrder().order.v1.OrderService)(address, credentials.createInsecure());
    const v2 = new (loadOrderV2().order.v2.OrderService)(address, credentials.createInsecure());
    const clients: Client[] = [v1, v2];
    const metadata = new Metadata();
    metadata.set('x-user-id', 'alice');
    metadata.set('x-user-role', 'USER');
    metadata.set('x-correlation-id', 'contract-test');
    function invoke<T>(
      call: (callback: (error: ServiceError | null, response?: T) => void) => void,
    ): Promise<T> {
      return new Promise((resolve, reject) =>
        call((error, response) => (error ? reject(error) : resolve(response as T))),
      );
    }
    try {
      const legacy = await invoke((cb) => v1.GetOrder({ orderId: 'order-1' }, metadata, cb));
      expect(legacy).toMatchObject({ success: true, totalAmount: 19.98, error: '' });
      const current = await invoke((cb) => v2.GetOrder({ orderId: 'order-1' }, metadata, cb));
      expect(current).toEqual({
        id: 'order-1',
        userId: 'alice',
        status: 'PENDING',
        total: { amount_minor: '1998', currency: 'USD', amount: '' },
        items: [
          {
            productId: 'p1',
            quantity: 2,
            price: { amount_minor: '999', currency: 'USD', amount: '' },
          },
        ],
      });
      const failure = await invoke((cb) =>
        v2.CreateOrder({ items: [{ productId: 'p1', quantity: 2 }] }, metadata, cb),
      ).then(
        () => {
          throw new Error('Expected a stock rejection');
        },
        (error: ServiceError) => error,
      );
      expect(failure.details).toBe('Insufficient stock');
      expect(failure.metadata.get('error-code')).toEqual(['INSUFFICIENT_STOCK']);
      expect(failure.metadata.get('http-status')).toEqual(['409']);
      expect(
        JSON.parse((failure.metadata.get('error-details-bin')[0] as Buffer).toString()),
      ).toEqual({ available: 1 });
    } finally {
      clients.forEach((client) => client.close());
      await new Promise<void>((resolve) => server.tryShutdown(() => resolve()));
    }
  });
});
