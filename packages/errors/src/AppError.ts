import { status, Metadata } from '@grpc/grpc-js';
import type { ServiceError } from '@grpc/grpc-js';
import { ApiError } from './errors/ApiError';

export class AppError extends ApiError {
  constructor(
    public readonly code: string,
    message: string,
    statusCode = 500,
  ) {
    super(statusCode, message);
    this.name = 'AppError';
  }
}

const httpToGrpc: Record<number, status> = {
  400: status.INVALID_ARGUMENT,
  401: status.UNAUTHENTICATED,
  403: status.PERMISSION_DENIED,
  404: status.NOT_FOUND,
  409: status.ALREADY_EXISTS,
  422: status.FAILED_PRECONDITION,
  429: status.RESOURCE_EXHAUSTED,
  501: status.UNIMPLEMENTED,
  503: status.UNAVAILABLE,
  504: status.DEADLINE_EXCEEDED,
};

export function toGrpcError(error: unknown): ServiceError {
  const known = error instanceof ApiError;
  const message = known && error.statusCode < 500 ? error.message : 'Internal service error';
  return Object.assign(new Error(message), {
    code: known ? (httpToGrpc[error.statusCode] ?? status.INTERNAL) : status.INTERNAL,
    details: message,
    metadata: new Metadata(),
  });
}

export function grpcToHttp(code: number): number {
  const mapping: Record<number, number> = {
    [status.INVALID_ARGUMENT]: 400,
    [status.UNAUTHENTICATED]: 401,
    [status.PERMISSION_DENIED]: 403,
    [status.NOT_FOUND]: 404,
    [status.ALREADY_EXISTS]: 409,
    [status.FAILED_PRECONDITION]: 422,
    [status.RESOURCE_EXHAUSTED]: 429,
    [status.UNIMPLEMENTED]: 501,
    [status.UNAVAILABLE]: 503,
    [status.DEADLINE_EXCEEDED]: 504,
  };
  return mapping[code] ?? 500;
}
