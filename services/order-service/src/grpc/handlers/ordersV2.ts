import { unary, userContext } from '@ecommerce/grpc-kit';
import { ValidationError, ForbiddenError } from '@ecommerce/errors';
import type { OrderV2ServiceHandlers } from '@ecommerce/proto-gen';
import * as orders from '../../services/orderService';
import { createOrderSchema, updateOrderStatusSchema } from '../../validators/orderValidators';
import { Prisma, type Order } from '../../utils/prismaClient';
const money = (value: Prisma.Decimal) => ({
  amount_minor: new Prisma.Decimal(value).mul(100).toFixed(0),
  currency: 'USD',
});
export const orderToProto = (
  order: Order & { items?: { productId: string; quantity: number; price: Prisma.Decimal }[] },
) => ({
  id: order.id,
  userId: order.userId,
  total: money(order.totalAmount),
  status: order.status,
  items: (order.items ?? []).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: money(item.price),
  })),
});
export const orderV2Handlers = {
  GetOrder: unary(async (request, call) => {
    const user = userContext(call.metadata);
    return orderToProto(await orders.getOrderById(request.orderId, user.userId, user.role));
  }),
  GetOrdersByUser: unary(async (request, call) => {
    const user = userContext(call.metadata);
    if (request.userId !== user.userId && user.role !== 'ADMIN')
      throw new ForbiddenError('Forbidden');
    const limit = request.limit ? Number(request.limit) : 50;
    const result = await orders.getOrders(request.userId, user.role, {
      limit,
      cursor: request.cursor || undefined,
    });
    return {
      orders: result.orders.map(orderToProto),
      nextCursor: result.nextCursor ?? '',
    };
  }),
  CreateOrder: unary(async (request, call) => {
    const user = userContext(call.metadata);
    const input = createOrderSchema.safeParse(request);
    if (!input.success)
      throw new ValidationError(
        'Invalid order',
        input.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      );
    return orderToProto(
      await orders.createOrder(user.userId, input.data.items, request.idempotencyKey || undefined),
    );
  }),
  UpdateOrderStatus: unary(async (request, call) => {
    const user = userContext(call.metadata);
    const input = updateOrderStatusSchema.safeParse(request);
    if (!input.success)
      throw new ValidationError(
        'Invalid status',
        input.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      );
    return orderToProto(
      await orders.updateOrderStatus(request.orderId, input.data, user.userId, user.role),
    );
  }),
  ReconcileReservation: unary(async (request) => orders.reconcileReservation(request.orderId)),
} satisfies Partial<OrderV2ServiceHandlers>;
