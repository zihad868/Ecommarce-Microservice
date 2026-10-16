import { Request, Response } from "express";
import httpStatus from "http-status";
import * as productService from "../services/productService";
import ApiError from "../errors/ApiError";
import catchAsync from "../shared/catchAsync";
import sendResponse from "../shared/sendResponse";

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.getProducts(
    req.query as Record<string, string | undefined>
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Products fetched successfully",
    data: result,
  });
});

export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id as string);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product fetched successfully",
    data: product,
  });
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    req.params.id as string,
    req.body
  );

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const success = await productService.deleteProduct(req.params.id as string);

  if (!success) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product deleted successfully",
    data: null,
  });
});
