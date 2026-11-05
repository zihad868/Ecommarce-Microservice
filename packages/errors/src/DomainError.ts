import { status } from '@grpc/grpc-js';
import { ApiError } from './errors/ApiError';

export class DomainError extends ApiError {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: number,
    public readonly grpcStatus: status,
    public readonly details?: unknown,
  ) {
    super(statusCode, message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Invalid request', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, status.INVALID_ARGUMENT, details);
  }
}
export class UnauthenticatedError extends DomainError {
  constructor(message = 'Authentication required') {
    super('UNAUTHENTICATED', message, 401, status.UNAUTHENTICATED);
  }
}
export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403, status.PERMISSION_DENIED);
  }
}
export class NotFoundError extends DomainError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404, status.NOT_FOUND);
  }
}
export class AlreadyExistsError extends DomainError {
  constructor(message = 'Resource already exists') {
    super('ALREADY_EXISTS', message, 409, status.ALREADY_EXISTS);
  }
}
export class InsufficientStockError extends DomainError {
  constructor(message = 'Insufficient stock', details?: unknown) {
    super('INSUFFICIENT_STOCK', message, 409, status.FAILED_PRECONDITION, details);
  }
}
export class ConcurrentModificationError extends DomainError {
  constructor(message = 'Resource changed, please retry') {
    super('CONCURRENT_MODIFICATION', message, 409, status.ABORTED);
  }
}
export class IdempotencyConflictError extends DomainError {
  constructor(message = 'Idempotency key reused with a different request') {
    super('IDEMPOTENCY_KEY_REUSED', message, 422, status.FAILED_PRECONDITION);
  }
}
export class DependencyUnavailableError extends DomainError {
  constructor(message = 'Dependency unavailable') {
    super('DEPENDENCY_UNAVAILABLE', message, 503, status.UNAVAILABLE);
  }
}
