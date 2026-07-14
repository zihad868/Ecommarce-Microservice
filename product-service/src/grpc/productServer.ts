import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import Product from '../models/Product';
import { getRedisClient } from '../utils/redisClient';

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

// Cache TTL: 10 minutes
const PRODUCT_CACHE_TTL = 600;

const getProduct = async (
  call: grpc.ServerUnaryCall<ProductRequest, ProductResponse>,
  callback: grpc.sendUnaryData<ProductResponse>
): Promise<void> => {
  try {
    const { productId } = call.request;
    const redis = getRedisClient();
    const cacheKey = `product:${productId}`;

    // 1. Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[gRPC] Cache HIT for product ${productId}`);
      const p = JSON.parse(cached);
      callback(null, {
        success: true,
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        stock: p.stock,
        error: '',
      });
      return;
    }

    // 2. Cache MISS -> query MongoDB
    console.log(`[gRPC] Cache MISS for product ${productId} — querying MongoDB`);
    const product = await Product.findById(productId).lean();

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

    // 3. Cache for future calls
    await redis.setex(cacheKey, PRODUCT_CACHE_TTL, JSON.stringify(product));

    callback(null, {
      success: true,
      id: product._id.toString(),
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
