import { loadAuth, loadAuthV2 } from '@ecommerce/proto-gen';
import type { AuthServiceHandlers, AuthV2ServiceHandlers } from '@ecommerce/proto-gen';
import { bindGrpc, unary, userContext } from '@ecommerce/grpc-kit';
import { ValidationError, NotFoundError, UnauthenticatedError } from '@ecommerce/errors';
import type { z } from 'zod';
import config from '../config';
import * as authService from '../services/authService';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidators';

const validate = <T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> => {
  const result = schema.safeParse(input);

  if (!result.success)
    throw new ValidationError(
      'Invalid request',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );

  return result.data as z.infer<T>;
};

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

      if (!user) throw new NotFoundError('User');

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
  const v2Handlers: AuthV2ServiceHandlers = {
    ...handlers,
    ValidateToken: unary(async (request) => {
      const result = await authService.validateToken(request.token);

      if (!result.valid) throw new UnauthenticatedError(result.error);

      return { userId: result.userId, role: result.role };
    }),
  };

  return bindGrpc(
    loadAuth().auth.v1.AuthService.service,
    handlers,
    `0.0.0.0:${config.GRPC_PORT}`,
    undefined,
    [{ definition: loadAuthV2().auth.v2.AuthService.service, handlers: v2Handlers }],
  );
};
