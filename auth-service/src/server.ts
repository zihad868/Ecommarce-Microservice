import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { startGrpcServer } from './grpc/authServer';
import errorHandler from './middlewares/errorHandler';
import authRoutes from './routes/authRoutes';

const app = express();
app.use(express.json());
app.use(cors());

// ── Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Strict limiter for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many login attempts, please try again after 15 minutes.' },
});

app.use(globalLimiter);

// ── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
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
app.use('/api/auth', authLimiter, authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service REST API running on port ${PORT}`));
