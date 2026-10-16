import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3002),
  GRPC_PORT: z.coerce.number().int().positive().default(50052),
  AUTH_GRPC_URL: z.string().default('localhost:50051'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  KAFKA_BROKER: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('product-service'),
  KAFKA_GROUP_ID: z.string().default('product-service-group'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid product-service configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
export default config;
