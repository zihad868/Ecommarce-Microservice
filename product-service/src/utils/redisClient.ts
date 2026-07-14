import Redis from 'ioredis';

let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times: number): number => Math.min(times * 100, 3000),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => console.log('Product Service: Redis connected'));
    redis.on('error', (err: Error) =>
      console.error('Product Service: Redis error', err.message)
    );
  }
  return redis;
};
