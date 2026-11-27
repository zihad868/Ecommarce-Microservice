import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';
import type Redis from 'ioredis';
import type { RequestHandler } from 'express';

export interface RateLimiterOptions {
  redisClient?: Redis;
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
  handler?: RequestHandler;
}

// RedisStore retains rejected script-loading promises after an outage. Load
// scripts on demand and retry initialization on the next request after failure;
// counters stay in Redis and enforcement never falls back to an in-memory store.
class RecoveringRedisStore extends RedisStore {
  private configuration?: Parameters<RedisStore['init']>[0];
  private initialization?: Promise<void>;

  override init(options: Parameters<RedisStore['init']>[0]): Promise<void> {
    this.configuration = options;
    return Promise.resolve();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.configuration) throw new Error('Rate limit store is not initialized');
    this.initialization ??= super.init(this.configuration).catch((error: unknown) => {
      this.initialization = undefined;
      throw error;
    });
    await this.initialization;
  }

  override async increment(key: string) {
    await this.ensureInitialized();
    try {
      return await super.increment(key);
    } catch (error) {
      this.initialization = undefined;
      throw error;
    }
  }

  override async get(key: string) {
    await this.ensureInitialized();
    try {
      return await super.get(key);
    } catch (error) {
      this.initialization = undefined;
      throw error;
    }
  }
}

/**
 * Uses Redis when supplied, otherwise an in-memory store. Redis errors block requests;
 * they never silently switch to a per-process store or bypass enforcement.
 */
export const createRedisRateLimiter = (options: RateLimiterOptions): RateLimitRequestHandler => {
  const redisClient = options.redisClient;
  const store = redisClient
    ? new RecoveringRedisStore({
        sendCommand: async (...args: string[]) => {
          const [command, ...parameters] = args;
          return (await redisClient.call(command, ...parameters)) as RedisReply;
        },
        prefix: options.prefix ?? 'rl:',
      })
    : undefined;

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: store,
    passOnStoreError: false,
    message: { success: false, message: options.message ?? 'Too many requests' },
    ...(options.handler ? { handler: options.handler } : {}),
  });
};

export default createRedisRateLimiter;
