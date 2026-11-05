import { randomUUID } from 'node:crypto';
import {
  ValidationError,
  IdempotencyConflictError,
  ConcurrentModificationError,
} from '@ecommerce/errors';
import prisma from '../utils/prismaClient';
import { decrementProductStockTx, invalidateProductCache } from './productService';

export interface StockItem {
  productId: string;
  quantity: number;
}
const canonical = (items: StockItem[]) => {
  if (!items.length || items.length > 100) throw new ValidationError('Invalid items');
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1)
      throw new ValidationError('Invalid quantity');
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  return [...merged]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([productId, quantity]) => ({ productId, quantity }));
};
export const reserveStock = async (orderId: string, input: StockItem[]) => {
  if (!orderId) throw new ValidationError('Order ID required');
  const items = canonical(input);
  const reservation = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 1))`;
      const existing = await tx.stockReservation.findUnique({ where: { orderId } });
      if (existing) {
        if (
          JSON.stringify(canonical(existing.items as unknown as StockItem[])) !==
          JSON.stringify(items)
        )
          throw new IdempotencyConflictError('Reservation reused with different items');
        if (existing.status === 'RELEASED')
          throw new ConcurrentModificationError('Reservation has expired or was released');
        return existing;
      }
      for (const item of items) await decrementProductStockTx(tx, item.productId, item.quantity);
      return tx.stockReservation.create({ data: { orderId, items } });
    },
    { timeout: 30_000 },
  );
  await Promise.all(items.map((item) => invalidateProductCache(item.productId)));
  return { reservationId: reservation.id };
};
export const releaseStock = async (orderId: string) => {
  const items = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 1))`;
    const reservation = await tx.stockReservation.findUnique({ where: { orderId } });
    if (!reservation || reservation.status !== 'RESERVED') return [];
    const items = reservation.items as unknown as StockItem[];
    await tx.stockReservation.update({ where: { orderId }, data: { status: 'RELEASED' } });
    for (const item of items)
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    await tx.outboxEvent.create({
      data: {
        aggregateId: orderId,
        eventType: 'StockReleased',
        payload: { eventId: randomUUID(), orderId },
      },
    });
    return items;
  });
  await Promise.all(items.map((item) => invalidateProductCache(item.productId)));
};
