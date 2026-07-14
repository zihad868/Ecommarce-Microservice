import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../utils/redisClient';

const prisma = new PrismaClient();

const PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Proto-loaded packages are dynamically typed — using 'any' is the standard approach
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

interface TokenRequest {
  token: string;
}

interface TokenResponse {
  valid: boolean;
  userId: string;
  error: string;
}

interface CachedUser {
  id: string;
  email: string;
  role: string;
}

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

// Cache TTL: 5 minutes
const USER_CACHE_TTL = 300;

const validateToken = async (
  call: grpc.ServerUnaryCall<TokenRequest, TokenResponse>,
  callback: grpc.sendUnaryData<TokenResponse>
): Promise<void> => {
  try {
    const { token } = call.request;

    if (!token) {
      callback(null, { valid: false, userId: '', error: 'No token provided' });
      return;
    }

    // 1. Verify JWT signature locally (no DB hit)
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecret123'
      ) as JwtPayload;
    } catch {
      callback(null, { valid: false, userId: '', error: 'Invalid token' });
      return;
    }

    const userId = decoded.id;
    const redis = getRedisClient();
    const cacheKey = `user:${userId}`;

    // 2. Check Redis cache first
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      console.log(`[gRPC] Cache HIT for user ${userId}`);
      callback(null, { valid: true, userId, error: '' });
      return;
    }

    // 3. Cache MISS → query PostgreSQL
    console.log(`[gRPC] Cache MISS for user ${userId} — querying DB`);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      callback(null, { valid: false, userId: '', error: 'User not found' });
      return;
    }

    // 4. Store in Redis for future requests
    const toCache: CachedUser = { id: user.id, email: user.email, role: user.role };
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(toCache));

    callback(null, { valid: true, userId: user.id, error: '' });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] validateToken error:', errMsg);
    callback(null, { valid: false, userId: '', error: 'Internal server error' });
  }
};

export const startGrpcServer = (): void => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10,
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });

  server.addService(authProto.auth.AuthService.service, { ValidateToken: validateToken });

  const port = process.env.GRPC_PORT || 50051;
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        return;
      }
      console.log(`Auth gRPC Server running on port ${boundPort}`);
    }
  );
};
