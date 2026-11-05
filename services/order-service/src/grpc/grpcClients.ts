import * as grpc from '@grpc/grpc-js';
import { loadAuth, loadProduct } from '@ecommerce/proto-gen';
import config from '../config';

const authProto = loadAuth();

const productProto = loadProduct();

export const authClient = new authProto.auth.v1.AuthService(
  config.AUTH_GRPC_URL,
  grpc.credentials.createInsecure(),
);

export const productClient = new productProto.product.v1.ProductService(
  config.PRODUCT_GRPC_URL,
  grpc.credentials.createInsecure(),
);

export interface ProductResponse {
  success: boolean;
  id: string;
  name: string;
  price: number;
  stock: number;
  error: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  role: string;
  error: string;
}

import { invokeResilientGrpc } from '@ecommerce/common';

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
