import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import prisma from '../utils/prismaClient';

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

/**
 * Auth middleware for the auth-service itself (protects /api/auth/me).
 * Validates JWT locally and fetches user from PostgreSQL.
 * Uses config.JWT_SECRET exclusively — no fallback. App will refuse to start
 * without a valid secret (enforced by config/index.ts zod schema).
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};
