import { loadProduct } from '@ecommerce/proto-gen';
import config from '../config';
import { ApiError, grpcToHttp } from '@ecommerce/errors';
import { invokeResilientGrpc, getClientCredentials } from '@ecommerce/grpc-kit';

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

export const reserveStock = async (
  orderId: string,
  items: { productId: string; quantity: number }[],
  timeoutMs = 10_000,
): Promise<void> => {
  try {
    await invokeResilientGrpc<
      { orderId: string; items: { productId: string; quantity: number }[] },
      unknown
    >(
      'catalog-service',
      'ReserveStock',
      (req, meta, options, cb) => {
        productClient.ReserveStock(req, meta, options, (error, response) => cb(error, response));
      },
      { orderId, items },
      { timeoutMs, maxRetries: 3 },
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'number') {
      const grpcErr = err as { code: number; details?: string; message: string };
      throw new ApiError(grpcToHttp(grpcErr.code), grpcErr.details ?? grpcErr.message);
    }
    throw err;
  }
};

export const releaseStockRemote = async (orderId: string, timeoutMs = 10_000): Promise<void> => {
  try {
    await invokeResilientGrpc<{ orderId: string }, unknown>(
      'catalog-service',
      'ReleaseStock',
      (req, meta, options, cb) => {
        productClient.ReleaseStock(req, meta, options, (error, response) => cb(error, response));
      },
      { orderId },
      { timeoutMs, maxRetries: 3 },
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'number') {
      const grpcErr = err as { code: number; details?: string; message: string };
      throw new ApiError(grpcToHttp(grpcErr.code), grpcErr.details ?? grpcErr.message);
    }
    throw err;
  }
};
