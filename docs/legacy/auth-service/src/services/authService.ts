import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import httpStatus from 'http-status';
import { ApiError } from '@ecommerce/common';
import config from '../config';
import prisma, { Role } from '../utils/prismaClient';
import { getRedisClient } from '../utils/redisClient';
import type { RegisterInput } from '../validators/authValidators';

const USER_CACHE_TTL = 300; // 5 minutes

export interface CachedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtTokenPayload {
  id: string;
  email: string;
  role: string;
}

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = async (userId: string, email: string, role: Role): Promise<AuthTokens> => {
  const payload: JwtTokenPayload = { id: userId, email, role };

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedRefreshToken = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId,
      hashedToken: hashedRefreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

export const registerUser = async (input: RegisterInput) => {
  const email = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'User with this email already exists');
  }

  const hashedPassword = await argon2.hash(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: Role.USER, // Public registration always creates USER. Admins come from seed scripts.
    },
  });

  const tokens = await generateTokens(user.id, user.email, user.role);

  // Pre-cache user in Redis
  const redis = getRedisClient();
  const cachedUser: CachedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser));

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens,
  };
};

export const loginUser = async (emailInput: string, passwordInput: string) => {
  const email = emailInput.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }

  const isPasswordValid = await argon2.verify(user.password, passwordInput);
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }

  const tokens = await generateTokens(user.id, user.email, user.role);

  // Cache user on login so gRPC token validation hits Redis
  const redis = getRedisClient();
  const cachedUser: CachedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser));

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens,
  };
};

export const refreshTokens = async (rawRefreshToken: string): Promise<AuthTokens> => {
  const hashed = hashToken(rawRefreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { hashedToken: hashed },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
  }

  // Reuse Detection: If already revoked, invalidate ALL sessions for this user
  if (tokenRecord.revoked) {
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { revoked: true },
    });
    const redis = getRedisClient();
    await redis.del(`user:${tokenRecord.userId}`);
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Refresh token reuse detected. All sessions revoked.',
    );
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token has expired');
  }

  // Rotate: revoke the old token and issue a new pair
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true },
  });

  return generateTokens(tokenRecord.user.id, tokenRecord.user.email, tokenRecord.user.role);
};

export const logoutUser = async (rawRefreshToken?: string, userId?: string) => {
  if (rawRefreshToken) {
    const hashed = hashToken(rawRefreshToken);
    await prisma.refreshToken
      .update({
        where: { hashedToken: hashed },
        data: { revoked: true },
      })
      .catch(() => undefined);
  }

  if (userId) {
    const redis = getRedisClient();
    await redis.del(`user:${userId}`);
  }
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
  let decoded: JwtTokenPayload;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET) as JwtTokenPayload;
  } catch {
    return { valid: false, userId: '', role: '', error: 'Invalid token' };
  }

  const userId = decoded.id;
  const redis = getRedisClient();
  const cacheKey = `user:${userId}`;

  // Check Redis cache first
  const cachedUserStr = await redis.get(cacheKey);
  if (cachedUserStr) {
    const cachedUser = JSON.parse(cachedUserStr) as CachedUser;
    return {
      valid: true,
      userId: cachedUser.id,
      role: cachedUser.role,
      error: '',
    };
  }

  // Cache MISS -> query PostgreSQL
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { valid: false, userId: '', role: '', error: 'User not found' };
  }

  const toCache: CachedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(toCache));

  return { valid: true, userId: user.id, role: user.role, error: '' };
};
