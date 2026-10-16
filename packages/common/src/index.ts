// ── Errors ────────────────────────────────────────────────────────────────────
export { ApiError } from './errors/ApiError';
export type {
  IGenericErrorMessage,
  IGenericErrorResponse,
  PrismaKnownError,
  PrismaValidationError,
} from './errors/prismaErrors';
export { handlePrismaClientError, handlePrismaValidationError } from './errors/prismaErrors';

// ── Shared utilities ──────────────────────────────────────────────────────────
export { default as catchAsync } from './shared/catchAsync';
export { default as sendResponse } from './shared/sendResponse';
export type { IApiResponse } from './shared/sendResponse';

// ── Middleware ────────────────────────────────────────────────────────────────
export { default as globalErrorHandler } from './middleware/errorHandler';
export {
  correlationIdMiddleware,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from './middleware/correlationId';

// ── Redis ─────────────────────────────────────────────────────────────────────
export { createRedisClient } from './redis/createRedisClient';
export type { RedisClientOptions } from './redis/createRedisClient';

// ── gRPC ──────────────────────────────────────────────────────────────────────
export { loadProto } from './grpc/protoLoader';
