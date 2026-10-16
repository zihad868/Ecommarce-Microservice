import type { Request, Response, NextFunction } from 'express';
import { authClient, type ValidateTokenResponse } from '../grpc/grpcClients';

export const protect = (req: Request, res: Response, next: NextFunction): void => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    return;
  }

  authClient.ValidateToken({ token }, (err: Error | null, response?: ValidateTokenResponse) => {
    if (err || !response?.valid) {
      res.status(401).json({
        success: false,
        error: response?.error ?? 'Not authorized',
      });
      return;
    }
    req.user = { id: response.userId, role: response.role };
    next();
  });
};
