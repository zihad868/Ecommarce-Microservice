import type { Request, Response, NextFunction } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import config from '../config';

const PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

const authClient = new authProto.auth.AuthService(
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
      'auth-service',
      'ValidateToken',
      (r, meta, options, cb) => {
        authClient.ValidateToken(r, meta, options, cb);
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
