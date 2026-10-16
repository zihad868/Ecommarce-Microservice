import { Request, Response } from "express";
import httpStatus from "http-status";
import * as orderService from "../services/orderService";
import { OrderItemInput } from "../services/orderService";
import ApiError from "../errors/ApiError";
import catchAsync from "../shared/catchAsync";
import sendResponse from "../shared/sendResponse";

interface OrderRequestBody {
  items: OrderItemInput[];
}

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const { items } = req.body as OrderRequestBody;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Order items are required");
  }

  const order = await orderService.createOrder(req.user!.id, items);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Order created successfully",
    data: order,
  });
});

export const getOrders = catchAsync(async (req: Request, res: Response) => {
  const orders = await orderService.getOrdersByUserId(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Orders fetched successfully",
    data: orders,
  });
});

export const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.getOrderByIdAndUser(
    req.params.id as string,
    req.user!.id
  );

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order fetched successfully",
    data: order,
  });
});
