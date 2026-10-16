import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { ApiError } from '../errors/ApiError';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware that verifies the authenticated user has at least one of the required roles.
 * Returns 401 if unauthenticated, 403 if authenticated but unauthorized.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `Forbidden: Role '${req.user.role}' lacks permission to access this resource`,
      );
    }

    next();
  };
};

export default requireRole;
