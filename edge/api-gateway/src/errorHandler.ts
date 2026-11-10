import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { z } from 'zod';
import { ApiError, DomainError, fromGrpcError, normalizeError } from '@ecommerce/errors';
import type { Metadata } from '@grpc/grpc-js';

interface GrpcLike {
  code: number;
  details: string;
  metadata?: Metadata;
}
const isGrpc = (error: unknown): error is GrpcLike =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number';

export const createErrorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error: unknown, req, res, next) => {
    if (res.headersSent) return next(error);

    let status = 500,
      code = 'INTERNAL',
      message = 'Internal service error';

    let details: unknown;

    const known = isGrpc(error) ? fromGrpcError(error) : normalizeError(error);

    if (error instanceof z.ZodError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'Invalid request';
      details = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
    } else if (known instanceof ApiError) {
      status = known.statusCode;
      code = known instanceof DomainError ? known.code : `HTTP_${status}`;

      message =
        status === 503
          ? 'Service unavailable'
          : status === 504
            ? 'Service timed out'
            : status < 500
              ? known.message
              : message;

      if (status < 500 && known instanceof DomainError) details = known.details;
    } else if (
      error instanceof SyntaxError &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      status = 400;
      code = 'INVALID_JSON';
      message = 'Invalid JSON';
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 413
    ) {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Payload too large';
    }

    if (status >= 500) {
      logger.error(
        {
          err: error,
          requestId: req.requestId,
          correlationId: req.correlationId,
          method: req.method,
          path: req.path,
        },
        'Request failed',
      );
    }

    res.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        requestId: req.requestId,
      },
    });
  };
