import type { Request, Response, NextFunction } from 'express';
import * as grpc from '@grpc/grpc-js';
import { loadAuth } from '@ecommerce/proto-gen';
import config from '../config';

const authProto = loadAuth();

const authClient = new authProto.auth.v1.AuthService(
  config.AUTH_GRPC_URL,
  grpc.credentials.createInsecure(),
);

interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  role: string;
  error: string;
}

import { invokeResilientGrpc } from '@ecommerce/common';

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
    const response = await invokeResilientGrpc<{ token: string }, ValidateTokenResponse>(
      'identity-service',
      'ValidateToken',
      (r, meta, options, cb) => {
        authClient.ValidateToken(r, meta, options, (error, response) =>
          cb(error, response as ValidateTokenResponse),
        );
      },
      { token },
      { timeoutMs: 3000, maxRetries: 2 },
    );

    if (!response.valid) {
      res.status(401).json({
        success: false,
        error: response.error || 'Not authorized',
      });
      return;
    }

    req.user = { id: response.userId, role: response.role };
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err?.message ?? 'Authentication service unavailable',
    });
  }
};
