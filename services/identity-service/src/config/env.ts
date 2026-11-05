import dotenv from 'dotenv';
import { z } from 'zod';
import { parseEnv, port, nodeEnv } from '@ecommerce/config';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: nodeEnv,
  PORT: port.default(3001),
  GRPC_PORT: port.default(50051),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: port.default(6379),
  REDIS_PASSWORD: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = parseEnv('identity-service', envSchema);
export type Env = z.infer<typeof envSchema>;
