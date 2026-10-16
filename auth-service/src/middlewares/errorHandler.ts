import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';
import handleClientError from '../errors/handleClientError';
import handleValidationError from '../errors/handleValidationError';
import { IGenericErrorMessage } from '../interfaces/error';

/**
 * Global Express error-handling middleware.
 *
 * Catches all errors forwarded via next(err) and maps them to a consistent
 * JSON response shape:
 *
 * {
 *   success: false,
 *   message: string,
 *   errorMessages: [{ path, message }],
 *   stack?: string          // only in non-production environments
 * }
 *
 * Handled error types (in priority order):
 *  1. Prisma.PrismaClientValidationError  → 400
 *  2. Prisma.PrismaClientKnownRequestError → 400 / 404 / 409 (by code)
 *  3. Prisma.PrismaClientInitializationError → 500
 *  4. Prisma.PrismaClientRustPanicError   → 500
 *  5. Prisma.PrismaClientUnknownRequestError → 500
 *  6. Custom ApiError                     → statusCode from error
 *  7. JWT TokenExpiredError               → 401
 *  8. JWT JsonWebTokenError               → 401
 *  9. SyntaxError / TypeError / ReferenceError → 400
 * 10. Generic Error                       → 500
 * 11. Unknown (non-Error)                 → 500
 */
const GlobalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = error?.message || 'Something went wrong!';
  let errorMessages: IGenericErrorMessage[] = [];

  // ── 1. Prisma Validation Error ─────────────────────────────
  if (error instanceof Prisma.PrismaClientValidationError) {
    const simplified = handleValidationError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;
  }

  // ── 2. Prisma Known Request Error ─────────────────────────
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const simplified = handleClientError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;

    // Override specific Prisma codes with more precise status/messages
    if (error.code === 'P2002') {
      statusCode = httpStatus.CONFLICT;
      message = `Duplicate entry on field(s): ${error.meta?.target}`;
      errorMessages = [
        {
          path: (error.meta?.target as string[])?.join(', ') || '',
          message,
        },
      ];
    } else if (error.code === 'P2025') {
      statusCode = httpStatus.NOT_FOUND;
      message = `Record not found: ${error.meta?.cause || 'No matching record.'}`;
      errorMessages = [{ path: '', message }];
    } else if (error.code === 'P2011') {
      statusCode = httpStatus.BAD_REQUEST;
      message = `Null constraint violation on: ${error.meta?.constraint}`;
      errorMessages = [{ path: (error.meta?.constraint as string) || '', message }];
    }
  }

  // ── 3. Prisma Initialization Error ────────────────────────
  else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Database initialization failed. Check your connection or configuration.';
    errorMessages = [{ path: '', message: 'Prisma Client Initialization Error' }];
  }

  // ── 4. Prisma Rust Panic Error ────────────────────────────
  else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'A critical database engine error occurred. Please try again later.';
    errorMessages = [{ path: '', message: 'Prisma Client Rust Panic Error' }];
  }

  // ── 5. Prisma Unknown Request Error ──────────────────────
  else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'An unknown database error occurred while processing the request.';
    errorMessages = [{ path: '', message: 'Prisma Client Unknown Request Error' }];
  }

  // ── 6. Custom ApiError ────────────────────────────────────
  else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
  }

  // ── 7 & 8. JWT Errors (name-based check — no extra dep needed) ──
  else if (error instanceof Error && error.name === 'TokenExpiredError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Your session has expired. Please log in again.';
    errorMessages = [
      {
        path: 'token',
        message:
          'expiredAt' in error && error.expiredAt
            ? `Token expired at ${new Date((error as any).expiredAt).toISOString()}`
            : 'Token has expired.',
      },
    ];
  } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Invalid token. Please log in again.';
    errorMessages = [{ path: 'token', message: error.message }];
  }

  // ── 9. Built-in JS Error types ────────────────────────────
  else if (error instanceof SyntaxError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Syntax error in the request. Please verify your input.';
    errorMessages = [{ path: '', message: 'Syntax Error' }];
  } else if (error instanceof TypeError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'An internal type error occurred.';
    errorMessages = [{ path: '', message: error.message }];
  } else if (error instanceof ReferenceError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'An internal reference error occurred.';
    errorMessages = [{ path: '', message: error.message }];
  }

  // ── 10. Generic Error ─────────────────────────────────────
  else if (error instanceof Error) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
  }

  // ── 11. Unknown / Non-Error throw ─────────────────────────
  else {
    message = 'An unexpected error occurred.';
    errorMessages = [{ path: '', message }];
  }

  // Log the raw error (server-side visibility)
  console.error(`[GlobalErrorHandler] ${req.method} ${req.originalUrl} →`, error);

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
  });
};

export default GlobalErrorHandler;
