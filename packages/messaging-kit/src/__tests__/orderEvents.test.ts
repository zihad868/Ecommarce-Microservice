import { describe, expect, it } from 'vitest';
import { decodeOrderCreated, encodeOrderCreated } from '../events/orderEvents';

const event = {
  eventId: '8d9daf60-ac02-44d6-961e-23679adf4f97',
  version: 1,
  eventType: 'OrderCreated',
  timestamp: '2026-11-05T00:00:00.000Z',
  orderId: 'order-1',
  userId: 'user-1',
  items: [{ productId: 'product-1', quantity: 2, price: 12.5 }],
  totalAmount: 25,
};
describe('OrderCreated v1 wire compatibility', () => {
  it('round trips a validated outbox payload through the actual protobuf contract', () => {
    expect(decodeOrderCreated(encodeOrderCreated(event))).toEqual(event);
  });
  it('rejects unrecognized versions before publishing', () => {
    expect(() => encodeOrderCreated({ ...event, version: 2 })).toThrow();
  });
  it('rejects malformed or structurally empty protobuf deliveries', () => {
    expect(() => decodeOrderCreated(Buffer.from([255]))).toThrow();
    expect(() => decodeOrderCreated(Buffer.alloc(0))).toThrow();
  });
});
