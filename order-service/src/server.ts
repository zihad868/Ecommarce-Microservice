import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectRabbitMQ } from './events/rabbitmq';
import { startGrpcServer } from './grpc/orderServer';
import errorHandler from './middlewares/errorHandler';
import orderRoutes from './routes/orderRoutes';

const app = express();
app.use(express.json());
app.use(cors());

// ── Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300, // Orders are write-heavy — more conservative limit
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'order-service',
    database: 'postgresql',
    grpc: 'enabled',
    timestamp: new Date().toISOString(),
  });
});

// ── Connect Services ───────────────────────────────────────
void connectRabbitMQ();
startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Order Service REST API running on port ${PORT}`));
