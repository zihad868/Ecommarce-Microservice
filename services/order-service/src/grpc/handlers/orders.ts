import { unary, userContext } from '@ecommerce/grpc-kit';
import { ApiError } from '@ecommerce/errors';
import type { OrderServiceHandlers } from '@ecommerce/proto-gen';
import * as orders from '../../services/orderService';
import {
  createOrderSchema,
  payOrderSchema,
  updateOrderStatusSchema,
} from '../../validators/orderValidators';
import type { Order } from '../../utils/prismaClient';
const response = (order: Order) => ({
  success: true,
  id: order.id,
  userId: order.userId,
  totalAmount: Number(order.totalAmount),
  status: order.status,
  error: '',
});
export const orderHandlers: OrderServiceHandlers = {
  GetOrder: unary(async (request, call) => {
    const user = userContext(call.metadata);
    return response(await orders.getOrderById(request.orderId, user.userId, user.role));
  }),
  GetOrdersByUser: unary(async (request, call) => {
    const user = userContext(call.metadata);
    if (request.userId !== user.userId && user.role !== 'ADMIN')
      throw new ApiError(403, 'Forbidden');
    const result = await orders.getOrders(request.userId, 'USER', { page: 1, limit: 50 });
    return { success: true, orders: result.orders.map(response), error: '' };
  }),
  CreateOrder: unary(async (request, call) => {
    const user = userContext(call.metadata);
    const input = createOrderSchema.safeParse(request);
    if (!input.success) throw new ApiError(400, 'Invalid order');
    return response(
      await orders.createOrder(user.userId, input.data.items, request.idempotencyKey || undefined),
    );
  }),
  PayOrder: unary(async (request, call) => {
    const user = userContext(call.metadata);
    const input = payOrderSchema.safeParse({ paymentMethod: request.paymentMethod || undefined });
    if (!input.success) throw new ApiError(400, 'Invalid payment');
    return response(await orders.payOrder(request.orderId, user.userId, user.role, input.data));
  }),
  UpdateOrderStatus: unary(async (request, call) => {
    const user = userContext(call.metadata);
    const input = updateOrderStatusSchema.safeParse(request);
    if (!input.success) throw new ApiError(400, 'Invalid status');
    return response(
      await orders.updateOrderStatus(request.orderId, input.data, user.userId, user.role),
    );
  }),
  ReconcileReservation: unary(async (request) => orders.reconcileReservation(request.orderId)),
};
