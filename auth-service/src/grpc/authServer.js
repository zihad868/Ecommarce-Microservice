const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const validateToken = async (call, callback) => {
  try {
    const { token } = call.request;
    if (!token) {
      return callback(null, { valid: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret123');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return callback(null, { valid: false, error: 'User not found' });
    }

    callback(null, { valid: true, userId: user.id.toString(), error: '' });
  } catch (error) {
    callback(null, { valid: false, error: 'Invalid token' });
  }
};

const startGrpcServer = () => {
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, { ValidateToken: validateToken });
  const port = process.env.GRPC_PORT || 50051;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err);
      return;
    }
    console.log(`Auth gRPC Server running on port ${boundPort}`);
  });
};

module.exports = { startGrpcServer };
