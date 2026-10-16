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
export { validateRequest } from './middleware/validateRequest';
export type { RequestValidationSchema } from './middleware/validateRequest';
export { createRedisRateLimiter } from './middleware/rateLimiter';
export type { RateLimiterOptions } from './middleware/rateLimiter';
export { requireRole } from './middleware/authRole';
export type { AuthenticatedUser } from './middleware/authRole';

// ── Redis ─────────────────────────────────────────────────────────────────────
export { createRedisClient } from './redis/createRedisClient';
export type { RedisClientOptions } from './redis/createRedisClient';

// ── gRPC ──────────────────────────────────────────────────────────────────────
export { loadProto } from './grpc/protoLoader';
export { getClientCredentials, getServerCredentials } from './grpc/credentials';

// ── Events ────────────────────────────────────────────────────────────────────
export {
  orderCreatedEventSchema,
  orderItemEventSchema,
  ORDER_CREATED_TOPIC,
  ORDER_CREATED_DLQ_TOPIC,
} from './events/orderEvents';
export type { OrderCreatedEvent, OrderItemEvent } from './events/orderEvents';
