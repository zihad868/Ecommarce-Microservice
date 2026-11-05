import { loadProduct } from '@ecommerce/proto-gen';
import config from '../config';
import { ApiError, grpcToHttp } from '@ecommerce/errors';

const productProto = loadProduct();

export const productClient = new productProto.product.v1.ProductService(
  config.PRODUCT_GRPC_URL,
  getClientCredentials(),
);

export interface ProductResponse {
  success: boolean;
  id: string;
  name: string;
  price: number;
  stock: number;
  error: string;
}

import { invokeResilientGrpc, getClientCredentials } from '@ecommerce/grpc-kit';

// Wrapper for gRPC product check with deadline, retries with jitter, and circuit breaker
export const getProductDetails = (
  productId: string,
  timeoutMs = 5000,
): Promise<ProductResponse> => {
  return invokeResilientGrpc<{ productId: string }, ProductResponse>(
    'catalog-service',
    'GetProduct',
    (req, meta, options, cb) => {
      productClient.GetProduct(req, meta, options, (error, response) =>
        cb(error, response as ProductResponse),
      );
    },
    { productId },
    { timeoutMs, maxRetries: 3 },
  );
};

export const reserveStock = (orderId: string, items: { productId: string; quantity: number }[]) =>
  new Promise<void>((resolve, reject) => {
    productClient.ReserveStock(
      { orderId, items },
      { deadline: new Date(Date.now() + 10_000) },
      (error) => {
        if (error) reject(new ApiError(grpcToHttp(error.code), error.details));
        else resolve();
      },
    );
  });
