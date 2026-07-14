const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { getRedisClient } = require('../utils/redisClient');

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

// Cache TTL: 5 minutes (tokens are valid for 1 day, but we cache user lookup)
const USER_CACHE_TTL = 300;

const validateToken = async (call, callback) => {
  try {
    const { token } = call.request;
    if (!token) {
      return callback(null, { valid: false, userId: '', error: 'No token provided' });
    }

    // 1. Verify JWT signature (no DB hit needed)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret123');
    } catch (jwtErr) {
      return callback(null, { valid: false, userId: '', error: 'Invalid token' });
    }

    const userId = decoded.id;
    const redis = getRedisClient();
    const cacheKey = `user:${userId}`;

    // 2. Check Redis cache first
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      console.log(`[gRPC] Cache HIT for user ${userId}`);
      return callback(null, { valid: true, userId, error: '' });
    }

    // 3. Cache MISS → query PostgreSQL
    console.log(`[gRPC] Cache MISS for user ${userId} — querying DB`);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return callback(null, { valid: false, userId: '', error: 'User not found' });
    }

    // 4. Store in Redis for future requests
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify({ id: user.id, email: user.email, role: user.role }));

    callback(null, { valid: true, userId: user.id, error: '' });
  } catch (error) {
    console.error('[gRPC] validateToken error:', error.message);
    callback(null, { valid: false, userId: '', error: 'Internal server error' });
  }
};

const startGrpcServer = () => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10, // 10MB
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });
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
