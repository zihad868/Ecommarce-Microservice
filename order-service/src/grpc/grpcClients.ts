import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

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
  process.env.AUTH_GRPC_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

export const productClient = new productProto.product.ProductService(
  process.env.PRODUCT_GRPC_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

interface ProductResponse {
  success: boolean;
  id: string;
  name: string;
  price: number;
  stock: number;
  error: string;
}

// Wrapper for gRPC product check
export const getProductDetails = (productId: string): Promise<ProductResponse> => {
  return new Promise((resolve, reject) => {
    productClient.GetProduct(
      { productId },
      (err: Error | null, response: ProductResponse) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
};
