import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { startGrpcServer } from './grpc/productServer';
import { connectRabbitMQ } from './events/rabbitmq';

import errorHandler from './middlewares/errorHandler';
import productRoutes from './routes/productRoutes';

const app = express();
app.use(express.json());
app.use(cors());

// ── Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000, // Products are read-heavy — higher limit
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'product-service',
    database: 'postgresql',
    cache: 'redis',
    timestamp: new Date().toISOString(),
  });
});

// ── Connect to Databases ───────────────────────────────────

void connectRabbitMQ();
startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
app.use('/api/products', productRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Product Service REST API running on port ${PORT}`));
