import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { ApiError } from '../errors/ApiError';
import type { IGenericErrorMessage, PrismaKnownError } from '../errors/prismaErrors';
import { handlePrismaClientError, handlePrismaValidationError } from '../errors/prismaErrors';
import { ZodError } from 'zod';

/**
 * Global Express error-handling middleware.
 *
 * Maps all error types to a consistent JSON envelope:
 * {
 *   success: false,
 *   message: string,
 *   errorMessages: [{ path, message }],
 *   stack?: string   // only outside production
 * }
 */
const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,

  _next: NextFunction,
): void => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong!';
  let errorMessages: IGenericErrorMessage[] = [];

  // ── Zod validation errors ─────────────────────────────────────────────────
  if (error instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation error';
    errorMessages = error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  // ── Prisma errors (duck-typed to avoid depending on generated Prisma Client) ─
  else if (error instanceof Error && error.name === 'PrismaClientValidationError') {
    const simplified = handlePrismaValidationError(error);
    ({ statusCode, message, errorMessages } = simplified);
  } else if (
    error instanceof Error &&
    error.name === 'PrismaClientKnownRequestError' &&
    'code' in error
  ) {
    const simplified = handlePrismaClientError(error as unknown as PrismaKnownError);
    ({ statusCode, message, errorMessages } = simplified);
  } else if (error instanceof Error && error.name === 'PrismaClientInitializationError') {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Database initialization failed.';
    errorMessages = [{ path: '', message: 'PrismaClientInitializationError' }];
  } else if (error instanceof Error && error.name === 'PrismaClientRustPanicError') {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'A critical database engine error occurred.';
    errorMessages = [{ path: '', message: 'PrismaClientRustPanicError' }];
  } else if (error instanceof Error && error.name === 'PrismaClientUnknownRequestError') {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'An unknown database error occurred.';
    errorMessages = [{ path: '', message: 'PrismaClientUnknownRequestError' }];
  }

  // ── Custom ApiError ───────────────────────────────────────────────────────
  else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = [{ path: '', message: error.message }];
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  else if (error instanceof Error && error.name === 'TokenExpiredError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Your session has expired. Please log in again.';
    errorMessages = [{ path: 'token', message: 'Token has expired.' }];
  } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Invalid token. Please log in again.';
    errorMessages = [{ path: 'token', message: error.message }];
  }

  // ── Generic Error ─────────────────────────────────────────────────────────
  else if (error instanceof Error) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = error.message;
    errorMessages = [{ path: '', message: error.message }];
  }

  // ── Unknown ───────────────────────────────────────────────────────────────
  else {
    message = 'An unexpected error occurred.';
    errorMessages = [{ path: '', message }];
  }

  const correlationId = (req as Request & { correlationId?: string }).correlationId;
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'HTTP error',
      method: req.method,
      url: req.originalUrl,
      statusCode,
      message,
      correlationId,
      stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
    }),
  );

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    correlationId,
    stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
  });
};

export default globalErrorHandler;
