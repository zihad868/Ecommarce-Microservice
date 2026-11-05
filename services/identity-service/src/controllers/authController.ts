import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ApiError, catchAsync, sendResponse } from '@ecommerce/common';
import * as authService from '../services/authService';
import type { LoginInput, RefreshTokenInput, RegisterInput } from '../validators/authValidators';

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body as RegisterInput);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;
  const result = await authService.loginUser(email, password);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully',
    data: result,
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as RefreshTokenInput;
  const tokens = await authService.refreshTokens(refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tokens refreshed successfully',
    data: tokens,
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as { refreshToken?: string } | undefined;
  const refreshToken = body?.refreshToken;
  const userId = req.user?.id;

  await authService.logoutUser(refreshToken, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Not authenticated');
  }

  const user = await authService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
    data: user,
  });
});
