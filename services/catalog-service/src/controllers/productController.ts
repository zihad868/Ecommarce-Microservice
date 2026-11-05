import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ApiError, catchAsync, sendResponse } from '@ecommerce/common';
import * as productService from '../services/productService';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../validators/productValidators';

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body as CreateProductInput);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.getProducts(req.query as unknown as ListProductsQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Products fetched successfully',
    meta: result.meta,
    data: result.products,
  });
});

export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id as string);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product fetched successfully',
    data: product,
  });
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    req.params.id as string,
    req.body as UpdateProductInput,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product deleted successfully',
    data: null,
  });
});
