import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaClient';
import httpStatus from 'http-status';
import { getRedisClient } from '../utils/redisClient';
import ApiError from '../errors/ApiError';

// Cache TTL: 5 minutes
const USER_CACHE_TTL = 300;

export interface CachedUser {
  id: string;
  email: string;
  role: string;
}

export const registerUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email and password are required');
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET ?? 'supersecret123', {
    expiresIn: '1d',
  });

  // Pre-cache user in Redis
  const redis = getRedisClient();
  const cachedUser: CachedUser = { id: user.id, email: user.email, role: user.role };
  await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser));

  return { token };
};

export const loginUser = async (email: string, password: string) => {
  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is required');
  }
  if (!password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid credentials');
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET ?? 'supersecret123', {
    expiresIn: '1d',
  });

  // Cache user on login so gRPC token validation hits Redis
  const redis = getRedisClient();
  const cachedUser: CachedUser = { id: user.id, email: user.email, role: user.role };
  await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser));

  return { token };
};

export const getUserById = async (id: string) => {
  const redis = getRedisClient();
  const cacheKey = `user:${id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as CachedUser;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = user;
  await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(userWithoutPassword));

  return userWithoutPassword;
};

export const validateToken = async (token: string) => {
  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET ?? 'supersecret123') as { id: string };
  } catch {
    return { valid: false, userId: '', error: 'Invalid token' };
  }

  const userId = decoded.id;
  const redis = getRedisClient();
  const cacheKey = `user:${userId}`;

  // Check Redis cache first
  const cachedUser = await redis.get(cacheKey);
  if (cachedUser) {
    return { valid: true, userId, error: '' };
  }

  // Cache MISS -> query PostgreSQL
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { valid: false, userId: '', error: 'User not found' };
  }

  // Store in Redis for future requests
  const toCache: CachedUser = { id: user.id, email: user.email, role: user.role };
  await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(toCache));

  return { valid: true, userId: user.id, error: '' };
};
