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

// Wrapper for gRPC product check with deadline
export const getProductDetails = (
  productId: string,
  timeoutMs = 3000,
): Promise<ProductResponse> => {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + timeoutMs);
    productClient.GetProduct(
      { productId },
      { deadline },
      (err: Error | null, response: ProductResponse) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(response);
      },
    );
  });
};
