import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';

export interface RequestValidationSchema {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Express middleware that validates req.body, req.params, and/or req.query
 * against Zod schemas. On validation failure, passes the ZodError to next(error)
 * for centralized handling in globalErrorHandler.
 */
export const validateRequest = (schema: RequestValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = (await schema.body.parseAsync(req.body)) as unknown;
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Record<string, string>;
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Record<string, any>;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
