import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import ApiError from '../errors/ApiError';
import handleClientError from '../errors/handleClientError';
import handleValidationError from '../errors/handleValidationError';
import { IGenericErrorMessage } from '../interfaces/error';

/**
 * Global Express error-handling middleware for order-service.
 *
 * Consistent JSON response shape:
 * {
 *   success: false,
 *   message: string,
 *   errorMessages: [{ path, message }],
 *   stack?: string   // non-production only
 * }
 */
const GlobalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = error?.message || 'Something went wrong!';
  let errorMessages: IGenericErrorMessage[] = [];

  // ── Prisma Validation Error ────────────────────────────────
  if (error instanceof Prisma.PrismaClientValidationError) {
    const simplified = handleValidationError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;
  }

  // ── Prisma Known Request Error ─────────────────────────────
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const simplified = handleClientError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;

    if (error.code === 'P2002') {
      statusCode = 409;
      message = `Duplicate entry on field(s): ${error.meta?.target}`;
      errorMessages = [
        { path: (error.meta?.target as string[])?.join(', ') || '', message },
      ];
    } else if (error.code === 'P2025') {
      statusCode = 404;
      message = `Record not found: ${error.meta?.cause || 'No matching record.'}`;
      errorMessages = [{ path: '', message }];
    } else if (error.code === 'P2011') {
      statusCode = 400;
      message = `Null constraint violation on: ${error.meta?.constraint}`;
      errorMessages = [{ path: (error.meta?.constraint as string) || '', message }];
    }
  }

  // ── Prisma Initialization Error ────────────────────────────
  else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database initialization failed. Check your connection.';
    errorMessages = [{ path: '', message: 'Prisma Client Initialization Error' }];
  }

  // ── Prisma Rust Panic Error ────────────────────────────────
  else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    message = 'A critical database engine error occurred.';
    errorMessages = [{ path: '', message: 'Prisma Client Rust Panic Error' }];
  }

  // ── Prisma Unknown Request Error ──────────────────────────
  else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'An unknown database error occurred.';
    errorMessages = [{ path: '', message: 'Prisma Client Unknown Request Error' }];
  }

  // ── Custom ApiError ────────────────────────────────────────
  else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
  }

  // ── JWT Token Errors ──────────────────────────────────────
  else if (error instanceof Error && error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
    errorMessages = [{ path: 'token', message: 'Token has expired.' }];
  } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
    errorMessages = [{ path: 'token', message: error.message }];
  }

  // ── Built-in JS Errors ────────────────────────────────────
  else if (error instanceof SyntaxError) {
    statusCode = 400;
    message = 'Syntax error in the request. Please verify your input.';
    errorMessages = [{ path: '', message: 'Syntax Error' }];
  } else if (error instanceof TypeError) {
    statusCode = 500;
    message = 'An internal type error occurred.';
    errorMessages = [{ path: '', message: error.message }];
  } else if (error instanceof ReferenceError) {
    statusCode = 500;
    message = 'An internal reference error occurred.';
    errorMessages = [{ path: '', message: error.message }];
  }

  // ── Generic Error ─────────────────────────────────────────
  else if (error instanceof Error) {
    statusCode = 500;
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
  }

  // ── Unknown ───────────────────────────────────────────────
  else {
    message = 'An unexpected error occurred.';
    errorMessages = [{ path: '', message }];
  }

  console.error(`[GlobalErrorHandler] ${req.method} ${req.originalUrl} →`, error);

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
  });
};

export default GlobalErrorHandler;
