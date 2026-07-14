import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../utils/redisClient';

const prisma = new PrismaClient();

// Cache TTL: 5 minutes
const USER_CACHE_TTL = 300;

interface CachedUser {
  id: string;
  email: string;
  role: string;
}

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

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      res.status(400).json({ success: false, error: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'supersecret123',
      { expiresIn: '1d' }
    );

    // Pre-cache user in Redis
    const redis = getRedisClient();
    const cachedUser: CachedUser = { id: user.id, email: user.email, role: user.role };
    await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser));

    res.status(201).json({ success: true, token });
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'supersecret123',
      { expiresIn: '1d' }
    );

    // Cache user on login so gRPC token validation hits Redis
    const redis = getRedisClient();
    const cachedUser: CachedUser = { id: user.id, email: user.email, role: user.role };
    await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser));

    res.status(200).json({ success: true, token });
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
    const redis = getRedisClient();
    const cacheKey = `user:${req.user!.id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, data: JSON.parse(cached) as CachedUser });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { password, ...userWithoutPassword } = user;
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(userWithoutPassword));

    res.status(200).json({ success: true, data: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};
