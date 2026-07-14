const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const authProtoPath = path.join(__dirname, '../../../protos/auth.proto');
const authPackageDef = protoLoader.loadSync(authProtoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const authProto = grpc.loadPackageDefinition(authPackageDef).auth;

const productProtoPath = path.join(__dirname, '../../../protos/product.proto');
const productPackageDef = protoLoader.loadSync(productProtoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const productProto = grpc.loadPackageDefinition(productPackageDef).product;

const authClient = new authProto.AuthService(
  process.env.AUTH_GRPC_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  process.env.PRODUCT_GRPC_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

// Wrapper for gRPC product check
const getProductDetails = (productId) => {
  return new Promise((resolve, reject) => {
    productClient.GetProduct({ productId }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
};

module.exports = { authClient, getProductDetails };
