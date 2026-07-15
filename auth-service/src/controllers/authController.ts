import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    try {
      const { token } = await authService.registerUser(email, password);
      res.status(201).json({ success: true, token });
    } catch (err: any) {
      if (err.message === 'User already exists') {
        res.status(400).json({ success: false, error: err.message });
      } else {
        throw err;
      }
    }
  } catch (err) {
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
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    try {
      const { token } = await authService.loginUser(email, password);
      res.status(200).json({ success: true, token });
    } catch (err: any) {
      if (err.message === 'Invalid credentials') {
        res.status(401).json({ success: false, error: err.message });
      } else {
        throw err;
      }
    }
  } catch (err) {
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
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
