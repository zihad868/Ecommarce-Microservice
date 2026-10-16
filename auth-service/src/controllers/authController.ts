import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import ApiError from '../errors/ApiError';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required'));
    }

    const { token } = await authService.registerUser(email, password);
    res.status(201).json({ success: true, token });
  } catch (err: any) {
    if (err.message === 'User already exists') {
      return next(new ApiError(409, 'User already exists'));
    }
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required'));
    }

    const { token } = await authService.loginUser(email, password);
    res.status(200).json({ success: true, token });
  } catch (err: any) {
    if (err.message === 'Invalid credentials') {
      return next(new ApiError(401, 'Invalid credentials'));
    }
    next(err);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.getUserById(req.user!.id);

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
