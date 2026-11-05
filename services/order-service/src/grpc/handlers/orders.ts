import { unary, userContext } from '@ecommerce/grpc-kit';
import { ValidationError, ForbiddenError } from '@ecommerce/errors';
import type { OrderServiceHandlers } from '@ecommerce/proto-gen';
import * as orders from '../../services/orderService';
import { createOrderSchema, updateOrderStatusSchema } from '../../validators/orderValidators';
import type { Order } from '../../utils/prismaClient';
const response = (order: Order) => ({
  success: true,
  id: order.id,
  userId: order.userId,
  totalAmount: Number(order.totalAmount),
  status: order.status,
  error: '',
});
export const orderHandlers = {
  GetOrder: unary(async (request, call) => {
    const user = userContext(call.metadata);
    return response(await orders.getOrderById(request.orderId, user.userId, user.role));
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
      success: true,
      orders: result.orders.map(response),
      nextCursor: result.nextCursor ?? '',
      error: '',
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
    return response(
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
    return response(
      await orders.updateOrderStatus(request.orderId, input.data, user.userId, user.role),
    );
  }),
  ReconcileReservation: unary(async (request) => orders.reconcileReservation(request.orderId)),
} satisfies Partial<OrderServiceHandlers>;
