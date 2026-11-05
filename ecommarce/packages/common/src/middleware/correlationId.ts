import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Middleware that attaches a correlation ID and a unique request ID to every
 * incoming HTTP request. The correlation ID is taken from the incoming header
 * if present (so it propagates from an upstream service), otherwise generated.
 *
 * Both IDs are echoed back in the response headers.
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.headers[CORRELATION_ID_HEADER] as string | undefined) ?? uuidv4();
  const requestId = uuidv4();

  // Attach to req so handlers can read them
  req.correlationId = correlationId;
  req.requestId = requestId;

  // Echo in response
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};

// ── Express request augmentation ─────────────────────────────────────────────
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string;
      requestId: string;
    }
  }
}
