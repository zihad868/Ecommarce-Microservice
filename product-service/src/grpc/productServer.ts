import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import * as productService from '../services/productService';

const PROTO_PATH = path.join(__dirname, '../../../protos/product.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const productProto = grpc.loadPackageDefinition(packageDefinition) as any;

interface ProductRequest {
  productId: string;
}

interface ProductResponse {
  success: boolean;
  id: string;
  name: string;
  price: number;
  stock: number;
  error: string;
}

const getProduct = async (
  call: grpc.ServerUnaryCall<ProductRequest, ProductResponse>,
  callback: grpc.sendUnaryData<ProductResponse>
): Promise<void> => {
  try {
    const { productId } = call.request;
    const product = await productService.getProductById(productId);

    if (!product) {
      callback(null, {
        success: false,
        id: '',
        name: '',
        price: 0,
        stock: 0,
        error: 'Product not found',
      });
      return;
    }

    callback(null, {
      success: true,
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      error: '',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] getProduct error:', errMsg);
    callback(null, {
      success: false,
      id: '',
      name: '',
      price: 0,
      stock: 0,
      error: 'Server Error',
    });
  }
};

export const startGrpcServer = (): void => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10,
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });

  server.addService(productProto.product.ProductService.service, { GetProduct: getProduct });

  const port = process.env.GRPC_PORT || 50052;
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        return;
      }
      console.log(`Product gRPC Server running on port ${boundPort}`);
    }
  );
};
