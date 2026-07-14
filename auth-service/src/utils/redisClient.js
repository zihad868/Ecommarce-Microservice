const Redis = require('ioredis');

let redis;

const getRedisClient = () => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      // Retry strategy for 10M-scale reliability
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => console.log('Auth Service: Redis connected'));
    redis.on('error', (err) => console.error('Auth Service: Redis error', err.message));
  }
  return redis;
};

module.exports = { getRedisClient };
