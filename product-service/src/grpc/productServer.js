const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Product = require('../models/Product');

const PROTO_PATH = path.join(__dirname, '../../../protos/product.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const productProto = grpc.loadPackageDefinition(packageDefinition).product;

const getProduct = async (call, callback) => {
  try {
    const { productId } = call.request;
    const product = await Product.findById(productId);

    if (!product) {
      return callback(null, { success: false, error: 'Product not found' });
    }

    callback(null, { 
      success: true, 
      id: product._id.toString(), 
      name: product.name, 
      price: product.price, 
      stock: product.stock, 
      error: '' 
    });
  } catch (error) {
    callback(null, { success: false, error: 'Server Error' });
  }
};

const startGrpcServer = () => {
  const server = new grpc.Server();
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
