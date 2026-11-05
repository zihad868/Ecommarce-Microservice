import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { UnauthenticatedError, AlreadyExistsError } from '@ecommerce/errors';
import config from '../config';
import prisma, { Role, type Prisma } from '../utils/prismaClient';
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
  issuedAt: number;
}

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = async (
  userId: string,
  email: string,
  role: Role,
  db: Prisma.TransactionClient = prisma,
): Promise<AuthTokens> => {
  const payload = { id: userId, email, role, issuedAt: Date.now() };
  const accessToken = jwt.sign(payload, config.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'), {
    algorithm: 'RS256',
    issuer: 'ecommerce-identity',
    audience: 'ecommerce-gateway',
    jwtid: crypto.randomUUID(),
    expiresIn: '15m',
  });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedRefreshToken = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.refreshToken.create({
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
    throw new AlreadyExistsError('User with this email already exists');
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
  await redis
    .setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser))
    .catch(() => undefined);

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens,
  };
};

export const loginUser = async (emailInput: string, passwordInput: string) => {
  const email = emailInput.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  const isPasswordValid = await argon2.verify(user.password, passwordInput);
  if (!isPasswordValid) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  const tokens = await generateTokens(user.id, user.email, user.role);

  // Cache user on login so gRPC token validation hits Redis
  const redis = getRedisClient();
  const cachedUser: CachedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  await redis
    .setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(cachedUser))
    .catch(() => undefined);

  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens,
  };
};

export const revokeUserAccess = async (userId: string): Promise<void> => {
  try {
    await getRedisClient().setex(`auth:revoked-before:${userId}`, 900, String(Date.now()));
  } catch {
    /* Bounded fail-open degradation: access tokens still expire after 15 minutes. */
  }
};
export const refreshTokens = async (rawRefreshToken: string): Promise<AuthTokens> => {
  const hashedToken = hashToken(rawRefreshToken);
  const result = await prisma.$transaction(async (tx) => {
    const initial = await tx.refreshToken.findUnique({ where: { hashedToken } });
    if (!initial) throw new UnauthenticatedError('Invalid refresh token');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${initial.userId}, 2))`;
    const record = await tx.refreshToken.findUniqueOrThrow({
      where: { hashedToken },
      include: { user: true },
    });
    if (record.revoked) {
      await tx.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { revoked: true },
      });
      return { reusedUserId: record.userId };
    }
    if (record.expiresAt <= new Date()) throw new UnauthenticatedError('Refresh token has expired');
    const { count } = await tx.refreshToken.updateMany({
      where: { id: record.id, revoked: false },
      data: { revoked: true },
    });
    if (!count) throw new UnauthenticatedError('Refresh token already used');
    return {
      tokens: await generateTokens(record.user.id, record.user.email, record.user.role, tx),
    };
  });
  if (result.reusedUserId) {
    await revokeUserAccess(result.reusedUserId);
    throw new UnauthenticatedError('Refresh token reuse detected. All sessions revoked.');
  }
  if (!result.tokens) throw new UnauthenticatedError('Invalid refresh token');
  return result.tokens;
};

export const logoutUser = async (_rawRefreshToken?: string, userId?: string) => {
  if (!userId) throw new UnauthenticatedError('Authenticated user required');
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 2))`;
    await tx.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  });
  await revokeUserAccess(userId);
  await getRedisClient()
    .del(`user:${userId}`)
    .catch(() => undefined);
};

export const getUserById = async (id: string) => {
  const redis = getRedisClient();
  const cacheKey = `user:${id}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    return JSON.parse(cached) as CachedUser;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = user;
  await redis
    .setex(cacheKey, USER_CACHE_TTL, JSON.stringify(userWithoutPassword))
    .catch(() => undefined);

  return userWithoutPassword;
};

export const validateToken = async (token: string) => {
  let decoded: JwtTokenPayload;
  try {
    decoded = jwt.verify(token, config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'), {
      algorithms: ['RS256'],
      issuer: 'ecommerce-identity',
      audience: 'ecommerce-gateway',
    }) as JwtTokenPayload;
  } catch {
    return { valid: false, userId: '', role: '', error: 'Invalid token' };
  }

  const userId = decoded.id;
  const redis = getRedisClient();
  const cacheKey = `user:${userId}`;

  const cutoff = await redis.get(`auth:revoked-before:${userId}`).catch(() => null);
  if (cutoff && decoded.issuedAt <= Number(cutoff))
    return { valid: false, userId: '', role: '', error: 'Token revoked' };
  // Check Redis cache first
  const cachedUserStr = await redis.get(cacheKey).catch(() => null);
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
  await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(toCache)).catch(() => undefined);

  return { valid: true, userId: user.id, role: user.role, error: '' };
};

export const changeUserRole = async (userId: string, role: Role) => {
  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  await revokeUserAccess(userId);
  await getRedisClient()
    .del(`user:${userId}`)
    .catch(() => undefined);
  return user;
};
