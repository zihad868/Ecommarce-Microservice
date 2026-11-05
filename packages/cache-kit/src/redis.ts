import { createLogger } from '@ecommerce/observability';
import type { RedisOptions } from 'ioredis';
import Redis from 'ioredis';

export interface RedisClientOptions {
  /** Service name for log prefixes, e.g. 'auth-service' */
  serviceName: string;
  host?: string;
  port?: number;
  password?: string;
}

/**
 * Creates and returns a Redis client for the calling service.
 * Call once at startup and inject the returned client.
 *
 * - Lazy connect (does not connect until first command)
 * - Automatic reconnect with capped exponential backoff
 * - Errors are logged but do NOT crash the process
 */
export const createRedisClient = (opts: RedisClientOptions): Redis => {
  const logger = createLogger({ serviceName: opts.serviceName });
  const host = opts.host ?? 'localhost';
  const port = opts.port ?? 6379;

  const options: RedisOptions = {
    host,
    port,
    password: opts.password ?? undefined,
    retryStrategy: (times: number): number => Math.min(times * 200, 5000),
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    commandTimeout: 1000,
    ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
  };

  const client = new Redis(options);

  client.on('connect', () => {
    logger.info(`${opts.serviceName}: Redis connected to ${host}:${String(port)}`);
  });
  client.on('ready', () => {
    logger.info(`${opts.serviceName}: Redis ready`);
  });
  client.on('error', (err: Error) => {
    logger.error(`${opts.serviceName}: Redis error — ${err.message}`);
  });
  client.on('close', () => {
    logger.warn(`${opts.serviceName}: Redis connection closed`);
  });

  return client;
};
