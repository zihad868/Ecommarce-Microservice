const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Product = require('../models/Product');
const { getRedisClient } = require('../utils/redisClient');

const PROTO_PATH = path.join(__dirname, '../../../protos/product.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const productProto = grpc.loadPackageDefinition(packageDefinition).product;

// Cache TTL: 10 minutes
const PRODUCT_CACHE_TTL = 600;

const getProduct = async (call, callback) => {
  try {
    const { productId } = call.request;
    const redis = getRedisClient();
    const cacheKey = `product:${productId}`;

    // 1. Check Redis cache (gRPC calls are frequent — cache is critical here)
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[gRPC] Cache HIT for product ${productId}`);
      const p = JSON.parse(cached);
      return callback(null, {
        success: true,
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        stock: p.stock,
        error: '',
      });
    }

    // 2. Cache MISS → query MongoDB
    console.log(`[gRPC] Cache MISS for product ${productId} — querying MongoDB`);
    const product = await Product.findById(productId).lean();

    if (!product) {
      return callback(null, { success: false, id: '', name: '', price: 0, stock: 0, error: 'Product not found' });
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
    console.error('[gRPC] getProduct error:', error.message);
    callback(null, { success: false, id: '', name: '', price: 0, stock: 0, error: 'Server Error' });
  }
};

const startGrpcServer = () => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10,
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });
  server.addService(productProto.ProductService.service, { GetProduct: getProduct });
  const port = process.env.GRPC_PORT || 50052;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err);
      return;
    }
    console.log(`Product gRPC Server running on port ${boundPort}`);
  });
};

module.exports = { startGrpcServer };
