import { z } from 'zod';
import { eventCodec } from '@ecommerce/proto-gen';

export const stockReservationFailedSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  reason: z.string().default(''),
  occurredAt: z.string().default(() => new Date().toISOString()),
});
export type StockReservationFailedEvent = z.infer<typeof stockReservationFailedSchema>;

export const stockReleasedSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  reason: z.string().default(''),
  occurredAt: z.string().default(() => new Date().toISOString()),
});
export type StockReleasedEvent = z.infer<typeof stockReleasedSchema>;

export const stockReleaseRequestedSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  reason: z.string().default(''),
  occurredAt: z.string().default(() => new Date().toISOString()),
});
export type StockReleaseRequestedEvent = z.infer<typeof stockReleaseRequestedSchema>;

const failedCodec = eventCodec(
  'inventory/v1/stock_reservation_failed.proto',
  'events.inventory.v1.StockReservationFailed',
);
const releasedCodec = eventCodec(
  'inventory/v1/stock_released.proto',
  'events.inventory.v1.StockReleased',
);
const releaseReqCodec = eventCodec(
  'order/v1/stock_release_requested.proto',
  'events.order.v1.StockReleaseRequested',
);

export const encodeStockReservationFailed = (e: unknown): Buffer =>
  failedCodec.serialize(stockReservationFailedSchema.parse(e));

export const decodeStockReservationFailed = (b: Buffer): StockReservationFailedEvent =>
  stockReservationFailedSchema.parse(failedCodec.deserialize(b));

export const encodeStockReleased = (e: unknown): Buffer =>
  releasedCodec.serialize(stockReleasedSchema.parse(e));

export const decodeStockReleased = (b: Buffer): StockReleasedEvent =>
  stockReleasedSchema.parse(releasedCodec.deserialize(b));

export const encodeStockReleaseRequested = (e: unknown): Buffer =>
  releaseReqCodec.serialize(stockReleaseRequestedSchema.parse(e));

export const decodeStockReleaseRequested = (b: Buffer): StockReleaseRequestedEvent =>
  stockReleaseRequestedSchema.parse(releaseReqCodec.deserialize(b));
