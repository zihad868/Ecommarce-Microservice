import type Redis from 'ioredis';
import { createRedisClient } from '@ecommerce/cache-kit';
import config from '../config';

let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  redis ??= createRedisClient({
    serviceName: 'identity-service',
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
  });
  return redis;
};

export default getRedisClient;
