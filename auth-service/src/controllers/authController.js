const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { getRedisClient } = require('../utils/redisClient');

const prisma = new PrismaClient();

// Cache TTL: 5 minutes
const USER_CACHE_TTL = 300;

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) return res.status(400).json({ success: false, error: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = await prisma.user.create({
      data: { email, password: hashedPassword }
    });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'supersecret123',
      { expiresIn: '1d' }
    );

    // Pre-cache the new user in Redis
    const redis = getRedisClient();
    await redis.setex(
      `user:${user.id}`,
      USER_CACHE_TTL,
      JSON.stringify({ id: user.id, email: user.email, role: user.role })
    );

    res.status(201).json({ success: true, token });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'supersecret123',
      { expiresIn: '1d' }
    );

    // Cache user on login so subsequent gRPC calls hit Redis
    const redis = getRedisClient();
    await redis.setex(
      `user:${user.id}`,
      USER_CACHE_TTL,
      JSON.stringify({ id: user.id, email: user.email, role: user.role })
    );

    res.status(200).json({ success: true, token });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const cacheKey = `user:${req.user.id}`;

    // Try Redis first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const userData = JSON.parse(cached);
      return res.status(200).json({ success: true, data: userData });
    }

    // Fall back to DB
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Don't send password back
    const { password, ...userWithoutPassword } = user;
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(userWithoutPassword));

    res.status(200).json({ success: true, data: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};
