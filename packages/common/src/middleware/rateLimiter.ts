import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type Redis from 'ioredis';

export interface RateLimiterOptions {
  redisClient?: Redis;
  windowMs: number;
  max: number;
  message: string;
  prefix?: string;
}

/**
 * Creates an Express rate limiter backed by Redis (or falls back gracefully to in-memory).
 */
export const createRedisRateLimiter = (options: RateLimiterOptions): RateLimitRequestHandler => {
  const store = options.redisClient
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          (options.redisClient as any).call(...args),
        prefix: options.prefix ?? 'rl:',
      })
    : undefined;

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: store as any,
    message: { success: false, message: options.message },
  });
};

export default createRedisRateLimiter;
