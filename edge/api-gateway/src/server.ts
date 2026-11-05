import { localTokenVerifier } from './tokenVerifier';
import { z } from 'zod';
import { parseEnv, port } from '@ecommerce/config';
import { createRedisClient, createRedisRateLimiter } from '@ecommerce/cache-kit';
import { registerGracefulShutdown } from '@ecommerce/grpc-kit';
import {
  createLogger,
  initMetrics,
  metricsHandler,
  metricsMiddleware,
} from '@ecommerce/observability';
import { createApp, rejectRateLimitedRequest } from './app';
import { createBackend } from './backend';
import express from 'express';

const env = parseEnv(
  'api-gateway',
  z.object({
    PORT: port.default(8081),
    JWT_PUBLIC_KEY: z.string().min(1),
    AUTH_GRPC_URL: z.string().default('localhost:50051'),
    PRODUCT_GRPC_URL: z.string().default('localhost:50052'),
    ORDER_GRPC_URL: z.string().default('localhost:50053'),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: port.default(6379),
    REDIS_PASSWORD: z.string().optional(),
    GATEWAY_REQUEST_LIMIT: z.coerce.number().int().positive().default(300),
    AUTH_REQUEST_LIMIT: z.coerce.number().int().positive().default(30),
  }),
);
const logger = createLogger({ serviceName: 'api-gateway' });
const redis = createRedisClient({
  serviceName: 'api-gateway',
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
});
const backend = createBackend({
  identity: env.AUTH_GRPC_URL,
  verifyToken: localTokenVerifier(env.JWT_PUBLIC_KEY, redis),
  catalog: env.PRODUCT_GRPC_URL,
  order: env.ORDER_GRPC_URL,
});
initMetrics('api-gateway');
const app = express();
app.use(metricsMiddleware());
app.use(
  createApp(backend, {
    logger,
    ready: async () => {
      await backend.ready();
    },
    limiter: createRedisRateLimiter({
      redisClient: redis,
      windowMs: 60_000,
      max: env.GATEWAY_REQUEST_LIMIT,
      prefix: 'rl:gateway:',
      handler: rejectRateLimitedRequest,
    }),
    authLimiter: createRedisRateLimiter({
      redisClient: redis,
      windowMs: 900_000,
      max: env.AUTH_REQUEST_LIMIT,
      prefix: 'rl:gateway:auth:',
      handler: rejectRateLimitedRequest,
    }),
  }),
);
// Metrics listener stays internal and does not add a public route to the gateway API.
const operations = express();
operations.get('/metrics', (req, res) => {
  void metricsHandler(req, res);
});
const operationsServer = operations.listen(env.PORT + 1000);
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Gateway listening');
});
registerGracefulShutdown({
  serviceName: 'api-gateway',
  httpServer: server,
  logger,
  onShutdown: async () => {
    backend.close();
    await redis.quit();
    await new Promise<void>((resolve) => operationsServer.close(() => resolve()));
  },
});
