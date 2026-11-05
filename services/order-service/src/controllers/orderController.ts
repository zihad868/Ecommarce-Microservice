import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ApiError, catchAsync, sendResponse } from '@ecommerce/common';
import * as orderService from '../services/orderService';
import type {
  CreateOrderInput,
  ListOrdersQuery,
  PayOrderInput,
  UpdateOrderStatusInput,
} from '../validators/orderValidators';

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { items } = req.body as CreateOrderInput;
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  const order = await orderService.createOrder(userId, items, idempotencyKey);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

export const getOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role ?? 'USER';
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const result = await orderService.getOrders(
    userId,
    userRole,
    req.query as unknown as ListOrdersQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Orders fetched successfully',
    meta: result.meta,
    data: result.orders,
  });
});

export const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role ?? 'USER';
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const order = await orderService.getOrderById(req.params.id as string, userId, userRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order fetched successfully',
    data: order,
  });
});

export const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role ?? 'USER';
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const order = await orderService.updateOrderStatus(
    req.params.id as string,
    req.body as UpdateOrderStatusInput,
    userId,
    userRole,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order status updated successfully',
    data: order,
  });
});

export const payOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role ?? 'USER';
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const order = await orderService.payOrder(
    req.params.id as string,
    userId,
    userRole,
    req.body as PayOrderInput,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment processed successfully',
    data: order,
  });
});
