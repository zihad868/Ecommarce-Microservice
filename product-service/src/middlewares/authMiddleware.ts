import { Request, Response, NextFunction } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

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
  process.env.AUTH_GRPC_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  error: string;
}

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    return;
  }

  authClient.ValidateToken(
    { token },
    (err: Error | null, response: ValidateTokenResponse) => {
      if (err || !response.valid) {
        res.status(401).json({
          success: false,
          error: response?.error || 'Not authorized',
        });
        return;
      }
      req.user = { id: response.userId };
      next();
    }
  );
};
