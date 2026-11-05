import dotenv from 'dotenv';
import { z } from 'zod';
import { parseEnv, port, nodeEnv } from '@ecommerce/config';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: nodeEnv,
  PORT: port.default(3002),
  GRPC_PORT: port.default(50052),
  AUTH_GRPC_URL: z.string().default('localhost:50051'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: port.default(6379),
  REDIS_PASSWORD: z.string().optional(),
  KAFKA_BROKER: z.string().default('localhost:9093'),
  KAFKA_CLIENT_ID: z.string().default('catalog-service'),
  // Keep the consumer group identity stable while renaming the workspace.
  KAFKA_GROUP_ID: z.string().default('product-service-group'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = parseEnv('catalog-service', envSchema);
export type Env = z.infer<typeof envSchema>;
