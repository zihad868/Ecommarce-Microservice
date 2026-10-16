import { Request, Response } from "express";
import httpStatus from "http-status";
import * as authService from "../services/authService";
import ApiError from "../errors/ApiError";
import catchAsync from "../shared/catchAsync";
import sendResponse from "../shared/sendResponse";

export const register = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email and password are required");
  }

  const { token } = await authService.registerUser(email, password);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data: { token },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email and password are required");
  }

  const { token } = await authService.loginUser(email, password);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: { token },
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.id);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});
