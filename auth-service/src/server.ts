import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
  correlationIdMiddleware,
  createRedisRateLimiter,
  globalErrorHandler,
} from '@ecommerce/common';
import config from './config';
import { startGrpcServer } from './grpc/authServer';
import authRoutes from './routes/authRoutes';
import prisma from './utils/prismaClient';
import { getRedisClient } from './utils/redisClient';

const app = express();

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

// ── Correlation ID Propagation ─────────────────────────────
app.use(correlationIdMiddleware);

// ── Rate Limiting (Redis-backed with in-memory fallback) ────
const redis = getRedisClient();

const globalLimiter = createRedisRateLimiter({
  redisClient: redis,
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  prefix: 'rl:auth:global:',
});
app.use(globalLimiter);

const authLimiter = createRedisRateLimiter({
  redisClient: redis,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes to prevent brute-force
  message: 'Too many login attempts, please try again after 15 minutes.',
  prefix: 'rl:auth:login:',
});

// ── Health Check ───────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'live' });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err) {
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ── Start gRPC Server ──────────────────────────────────────
startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

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
  console.log(`Auth Service REST API running on port ${String(config.PORT)}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`[Auth Service] Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    console.log('[Auth Service] Closed HTTP server.');
  });

  try {
    await prisma.$disconnect();
    console.log('[Auth Service] Disconnected Prisma.');
  } catch (err) {
    console.error('[Auth Service] Error disconnecting Prisma:', err);
  }

  try {
    redis.disconnect();
    console.log('[Auth Service] Disconnected Redis.');
  } catch (err) {
    console.error('[Auth Service] Error disconnecting Redis:', err);
  }

  process.exit(0);
};

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

export default app;
