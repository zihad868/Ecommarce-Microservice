import pino, { type Logger } from 'pino';
import type { Request, Response, NextFunction } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlationId';

const SENSITIVE_KEYS = [
  'password',
  '*.password',
  'token',
  '*.token',
  'refreshToken',
  '*.refreshToken',
  'authorization',
  'headers.authorization',
  'cookie',
  'headers.cookie',
  'secret',
  'jwtSecret',
];

export interface CreateLoggerOptions {
  serviceName: string;
  level?: string;
}

/**
 * Creates a structured JSON pino logger with sensitive data redaction.
 */
export const createLogger = (options: CreateLoggerOptions): Logger => {
  return pino({
    name: options.serviceName,
    level:
      options.level ??
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: {
      paths: SENSITIVE_KEYS,
      censor: '[REDACTED]',
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
};

/**
 * Express middleware for structured HTTP access logging with correlation ID propagation.
 */
export const createHttpLoggingMiddleware = (logger: Logger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      (req.headers['x-request-id'] as string) ||
      'unknown';

    const reqLogger = logger.child({
      correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
    });

    // Attach child logger to request object
    (req as any).log = reqLogger;

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      if (statusCode >= 500) {
        reqLogger.error({ statusCode, durationMs }, 'HTTP request error');
      } else if (statusCode >= 400) {
        reqLogger.warn({ statusCode, durationMs }, 'HTTP client error');
      } else {
        reqLogger.info({ statusCode, durationMs }, 'HTTP request completed');
      }
    });

    next();
  };
};

export default createLogger;
