import { Metadata, status } from '@grpc/grpc-js';
import type { ServiceError } from '@grpc/grpc-js';
import { ApiError } from './errors/ApiError';
import {
  AlreadyExistsError,
  ConcurrentModificationError,
  DependencyUnavailableError,
  DomainError,
  NotFoundError,
  ValidationError,
} from './DomainError';

const httpToGrpc: Record<number, status> = {
  400: status.INVALID_ARGUMENT,
  401: status.UNAUTHENTICATED,
  403: status.PERMISSION_DENIED,
  404: status.NOT_FOUND,
  409: status.ALREADY_EXISTS,
  422: status.FAILED_PRECONDITION,
  429: status.RESOURCE_EXHAUSTED,
  499: status.CANCELLED,
  501: status.UNIMPLEMENTED,
  503: status.UNAVAILABLE,
  504: status.DEADLINE_EXCEEDED,
};

export function normalizeError(error: unknown): ApiError | undefined {
  if (error instanceof ApiError) return error;
  const code =
    typeof error === 'object' && error !== null
      ? 'code' in error
        ? error.code
        : 'errorCode' in error
          ? error.errorCode
          : undefined
      : undefined;
  switch (code) {
    case 'P2002':
      return new AlreadyExistsError();
    case 'P2025':
      return new NotFoundError();
    case 'P2003':
      return new ValidationError('Related resource does not exist');
    case 'P2034':
      return new ConcurrentModificationError();
    case 'P2024':
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1017':
      return new DependencyUnavailableError('Database unavailable');
    default:
      return undefined;
  }
}

export const isServerError = (error: unknown): boolean => {
  const known = normalizeError(error);
  return !known || known.statusCode >= 500;
};

export function toGrpcError(error: unknown): ServiceError {
  const known = normalizeError(error);
  const metadata = new Metadata();
  const http = known?.statusCode ?? 500;
  const code =
    known instanceof DomainError ? known.grpcStatus : (httpToGrpc[http] ?? status.INTERNAL);
  const errorCode = known instanceof DomainError ? known.code : known ? `HTTP_${http}` : 'INTERNAL';
  const message =
    known && http < 500
      ? known.message
      : http === 503
        ? 'Service temporarily unavailable'
        : 'Internal service error';
  if (known instanceof DomainError && known.details !== undefined && http < 500) {
    metadata.set('error-details-bin', Buffer.from(JSON.stringify(known.details)));
  }
  metadata.set('error-code', errorCode);
  metadata.set('http-status', String(http));
  return Object.assign(new Error(message), { code, details: message, metadata });
}

export function grpcToHttp(code: number): number {
  const map: Record<number, number> = {
    [status.INVALID_ARGUMENT]: 400,
    [status.OUT_OF_RANGE]: 400,
    [status.UNAUTHENTICATED]: 401,
    [status.PERMISSION_DENIED]: 403,
    [status.NOT_FOUND]: 404,
    [status.ALREADY_EXISTS]: 409,
    [status.ABORTED]: 409,
    [status.FAILED_PRECONDITION]: 422,
    [status.RESOURCE_EXHAUSTED]: 429,
    [status.CANCELLED]: 499,
    [status.UNIMPLEMENTED]: 501,
    [status.UNAVAILABLE]: 503,
    [status.DEADLINE_EXCEEDED]: 504,
  };
  return map[code] ?? 500;
}

export function fromGrpcError(
  error: Pick<ServiceError, 'code' | 'details'> & { metadata?: Metadata },
): DomainError {
  const candidate = Number(error.metadata?.get('http-status')[0]);
  const http =
    Number.isInteger(candidate) && candidate >= 400 && candidate < 600
      ? candidate
      : grpcToHttp(error.code);
  const code = String(error.metadata?.get('error-code')[0] ?? 'UPSTREAM_ERROR');
  let details: unknown;
  const bin = error.metadata?.get('error-details-bin')[0];
  if (http < 500 && Buffer.isBuffer(bin)) {
    try {
      details = JSON.parse(bin.toString());
    } catch {
      /* Ignore malformed upstream details. */
    }
  }
  const message =
    http < 500
      ? error.details || 'Request rejected'
      : http === 503
        ? 'Service temporarily unavailable'
        : 'Internal service error';
  return new DomainError(code, message, http, error.code, details);
}
