import { createRedisRateLimiter } from '@ecommerce/cache-kit';
import type { RateLimiterOptions } from '@ecommerce/cache-kit';
import { ApiError, DependencyUnavailableError } from '@ecommerce/errors';
import type { RequestHandler } from 'express';

export const createGatewayRateLimiter = (options: RateLimiterOptions): RequestHandler => {
  const limiter = createRedisRateLimiter(options);

  return (req, res, next) => {
    void limiter(req, res, (error?: unknown) => {
      if (!error || error instanceof ApiError) return next(error);
      next(new DependencyUnavailableError('Rate limit check unavailable'));
    });
  };
};

export const createGatewayReadiness = (
  backend: { ready(): Promise<void> },
  redis: { ping(): Promise<string> },
): (() => Promise<void>) => {
  return async () => {
    await Promise.all([backend.ready(), redis.ping()]);
  };
};
