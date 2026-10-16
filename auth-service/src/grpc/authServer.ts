import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import config from '../config';
import * as authService from '../services/authService';

const PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Proto-loaded packages are dynamically typed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

interface TokenRequest {
  token: string;
}

interface TokenResponse {
  valid: boolean;
  userId: string;
  role: string;
  error: string;
}

const validateToken = async (
  call: grpc.ServerUnaryCall<TokenRequest, TokenResponse>,
  callback: grpc.sendUnaryData<TokenResponse>,
): Promise<void> => {
  try {
    const { token } = call.request;

    if (!token) {
      callback(null, {
        valid: false,
        userId: '',
        role: '',
        error: 'No token provided',
      });
      return;
    }

    const result = await authService.validateToken(token);
    callback(null, result);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] validateToken error:', errMsg);
    callback(null, {
      valid: false,
      userId: '',
      role: '',
      error: 'Internal server error',
    });
  }
};

export const startGrpcServer = (): void => {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 10,
    'grpc.max_send_message_length': 1024 * 1024 * 10,
  });

  server.addService(authProto.auth.AuthService.service, {
    ValidateToken: (call: any, callback: any) => {
      void validateToken(call, callback);
    },
  });

  const port = config.GRPC_PORT;
  server.bindAsync(
    `0.0.0.0:${String(port)}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        return;
      }
      console.log(`Auth gRPC Server running on port ${String(boundPort)}`);
    },
  );
};
