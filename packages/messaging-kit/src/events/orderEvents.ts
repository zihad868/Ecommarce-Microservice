import { z } from 'zod';
import { eventCodec } from '@ecommerce/proto-gen';

export const orderItemEventSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000'),
  price: z.number().min(0, 'Price must be non-negative'),
});

export const orderCreatedEventSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  version: z.literal(1),
  eventType: z.literal('OrderCreated'),
  timestamp: z.string(),
  orderId: z.string().min(1, 'Order ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  items: z.array(orderItemEventSchema).min(1, 'Order must contain at least 1 item'),
  totalAmount: z.number().min(0),
});

export type OrderItemEvent = z.infer<typeof orderItemEventSchema>;
export type OrderCreatedEvent = z.infer<typeof orderCreatedEventSchema>;

export const ORDER_CREATED_TOPIC = 'order.created.v1';
export const ORDER_CREATED_DLQ_TOPIC = `${ORDER_CREATED_TOPIC}.dlq`;

const codec = eventCodec('order/v1/order_created.proto', 'events.order.v1.OrderCreated');

export const encodeOrderCreated = (event: unknown): Buffer =>
  codec.serialize(orderCreatedEventSchema.parse(event));

export const decodeOrderCreated = (bytes: Buffer): OrderCreatedEvent =>
  orderCreatedEventSchema.parse(codec.deserialize(bytes));
