import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import config from '../config';

const authProtoPath = path.join(__dirname, '../../../protos/auth.proto');
const authPackageDef = protoLoader.loadSync(authProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authProto = grpc.loadPackageDefinition(authPackageDef) as any;

const productProtoPath = path.join(__dirname, '../../../protos/product.proto');
const productPackageDef = protoLoader.loadSync(productProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const productProto = grpc.loadPackageDefinition(productPackageDef) as any;

export const authClient = new authProto.auth.AuthService(
  config.AUTH_GRPC_URL,
  grpc.credentials.createInsecure(),
);

export const productClient = new productProto.product.ProductService(
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
    'product-service',
    'GetProduct',
    (req, meta, options, cb) => {
      productClient.GetProduct(req, meta, options, cb);
    },
    { productId },
    { timeoutMs, maxRetries: 3 },
  );
};
