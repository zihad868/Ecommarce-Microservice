import dotenv from 'dotenv';
import { z } from 'zod';
import { parseEnv, port, nodeEnv } from '@ecommerce/config';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: nodeEnv,
  PORT: port.default(3003),
  GRPC_PORT: port.default(50053),
  AUTH_GRPC_URL: z.string().default('localhost:50051'),
  PRODUCT_GRPC_URL: z.string().default('localhost:50052'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: port.default(6379),
  REDIS_PASSWORD: z.string().optional(),
  KAFKA_BROKER: z.string().default('localhost:9093'),
  KAFKA_CLIENT_ID: z.string().default('order-service'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = parseEnv('order-service', envSchema);
export type Env = z.infer<typeof envSchema>;
