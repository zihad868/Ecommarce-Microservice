import { z } from 'zod';

const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000 per line item'),
});

export const createOrderSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, 'Order must contain at least 1 item')
    .transform((items) => {
      // Merge duplicate productIds automatically
      const merged = new Map<string, number>();
      for (const item of items) {
        merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
      }
      return Array.from(merged.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
    }),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').default(10),
  cursor: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
});

export const payOrderSchema = z.object({
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'MOCK']).default('MOCK'),
  transactionId: z.string().optional(),
});

export type CreateOrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type PayOrderInput = z.infer<typeof payOrderSchema>;
