require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { startGrpcServer } = require('./grpc/authServer');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use(cors());

// ── Rate Limiting ──────────────────────────────────────────
// Global limiter: 500 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Strict limiter for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many login attempts, please try again after 15 minutes.' },
});

app.use(globalLimiter);

// ── Health Check (required for load balancer / Docker healthcheck) ──
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    database: 'postgresql',
    cache: 'redis',
    timestamp: new Date().toISOString(),
  });
});

// ── Start gRPC Server ──────────────────────────────────────
startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authLimiter, authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service REST API running on port ${PORT}`));
