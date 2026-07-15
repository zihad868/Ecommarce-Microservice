import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../utils/redisClient';

const prisma = new PrismaClient();

// Cache TTL: 5 minutes
const USER_CACHE_TTL = 300;

export interface CachedUser {
  id: string;
  email: string;
  role: string;
}

export const registerUser = async (email: string, password: string) => {
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    throw new Error('User already exists');
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

  return { token };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
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

  const { password, ...userWithoutPassword } = user;
  await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(userWithoutPassword));

  return userWithoutPassword;
};

export const validateToken = async (token: string) => {
  let decoded: any;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecret123'
    );
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
