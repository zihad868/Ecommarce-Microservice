import { describe, it, expect, vi } from 'vitest';

vi.mock('../config', () => ({
  default: { NODE_ENV: 'production' },
  config: { NODE_ENV: 'production' },
  env: { NODE_ENV: 'production' },
}));

vi.mock('../utils/prismaClient', () => ({
  default: {},
  OrderStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PAID: 'PAID',
    SHIPPED: 'SHIPPED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  Prisma: {
    Decimal: class {
      constructor(public val: string | number) {}
    },
  },
}));

vi.mock('../grpc/grpcClients', () => ({
  getProductDetails: vi.fn(),
  reserveStock: vi.fn(),
  releaseStockRemote: vi.fn(),
}));

import { payOrder } from '../services/orderService';

describe('payOrder production guard', () => {
  it('throws ApiError with status 403 when payOrder is called in production', async () => {
    await expect(payOrder('order-1', 'user-1', 'USER', { paymentMethod: 'MOCK' })).rejects.toThrow(
      'Mock payment disabled',
    );
  });
});
