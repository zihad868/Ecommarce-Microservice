import { loadAuth } from '@ecommerce/proto-gen';
import type { AuthServiceHandlers } from '@ecommerce/proto-gen';
import { bindGrpc, unary, userContext } from '@ecommerce/grpc-kit';
import { ApiError } from '@ecommerce/errors';
import type { z } from 'zod';
import config from '../config';
import * as authService from '../services/authService';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidators';

function validate<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'Invalid request');
  return result.data as z.infer<T>;
}

export const startGrpcServer = () => {
  const handlers: AuthServiceHandlers = {
    Logout: unary(async (request, call) => {
      const user = userContext(call.metadata);
      await authService.logoutUser(request.refreshToken, user.userId);
      return {};
    }),
    GetUser: unary(async (_request, call) => {
      const context = userContext(call.metadata);
      const user = await authService.getUserById(context.userId);
      if (!user) throw new ApiError(404, 'User not found');
      return { id: user.id, email: user.email, role: user.role };
    }),
    ValidateToken: unary(async (request) => authService.validateToken(request.token)),
    Register: unary(async (request) => authService.registerUser(validate(registerSchema, request))),
    Login: unary(async (request) => {
      const input = validate(loginSchema, request);
      return authService.loginUser(input.email, input.password);
    }),
    Refresh: unary(async (request) =>
      authService.refreshTokens(validate(refreshTokenSchema, request).refreshToken),
    ),
  };
  return bindGrpc(loadAuth().auth.v1.AuthService.service, handlers, `0.0.0.0:${config.GRPC_PORT}`);
};
