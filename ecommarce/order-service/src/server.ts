import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
  correlationIdMiddleware,
  createHealthRouter,
  createHttpLoggingMiddleware,
  createLogger,
  createRedisClient,
  createRedisRateLimiter,
  globalErrorHandler,
  initMetrics,
  metricsHandler,
  metricsMiddleware,
  registerGracefulShutdown,
} from '@ecommerce/common';
import config from './config';
import { connectKafkaProducer, disconnectKafkaProducer } from './events/kafka';
import { startOutboxWorker, stopOutboxWorker } from './events/outboxWorker';
import { startGrpcServer } from './grpc/orderServer';
import orderRoutes from './routes/orderRoutes';
import prisma from './utils/prismaClient';

const app = express();

// ── Observability: Logger & Metrics ────────────────────────
const logger = createLogger({ serviceName: 'order-service' });
initMetrics('order-service');

// ── Security Headers & Proxy ───────────────────────────────
app.use(helmet());
app.set('trust proxy', 1);

// ── Restrictive CORS Allowlist ─────────────────────────────
const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-request-id',
      'idempotency-key',
    ],
  }),
);

// ── Body Parser Limits ─────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── Correlation ID & HTTP Logging & Metrics ────────────────
app.use(correlationIdMiddleware);
app.use(createHttpLoggingMiddleware(logger));
app.use(metricsMiddleware());

// ── Prometheus Metrics Endpoint ────────────────────────────
app.get('/metrics', (req: Request, res: Response) => {
  void metricsHandler(req, res);
});

// ── Health Checks (Liveness & Deep Readiness) ──────────────
const redis = createRedisClient({
  serviceName: 'order-service',
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
});

app.use(
  createHealthRouter({
    checkDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    checkRedis: async () => {
      await redis.ping();
    },
  }),
);

// ── Rate Limiting (Redis-backed with in-memory fallback) ────
const globalLimiter = createRedisRateLimiter({
  redisClient: redis,
  windowMs: 60 * 1000,
  max: 300,
  message: 'Too many requests, please try again later.',
  prefix: 'rl:order:global:',
});
app.use(globalLimiter);

// ── Start Kafka, Outbox Worker & gRPC ───────────────────────
void connectKafkaProducer();
startOutboxWorker(1000); // Poll outbox every 1 second
const grpcServer = startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
app.use('/api/orders', orderRoutes);

// ── 404 Handler ────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API NOT FOUND!',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'Your requested path was not found!',
      },
    ],
  });
});

// ── Centralized Error Handling ─────────────────────────────
app.use(globalErrorHandler);

// ── HTTP Server & Graceful Shutdown ────────────────────────
const server = app.listen(config.PORT, () => {
  logger.info(`Order Service REST API running on port ${String(config.PORT)}`);
});

registerGracefulShutdown({
  serviceName: 'order-service',
  httpServer: server,
  grpcServer,
  logger,
  onShutdown: async () => {
    stopOutboxWorker();
    try {
      await disconnectKafkaProducer();
    } catch (err) {
      logger.warn({ err }, 'Error disconnecting Kafka producer');
    }
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.warn({ err }, 'Error disconnecting Prisma');
    }
    try {
      redis.disconnect();
    } catch (err) {
      logger.warn({ err }, 'Error disconnecting Redis');
    }
  },
});

export default app;
