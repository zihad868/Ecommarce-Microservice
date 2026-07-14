require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getProductDetails } = require('./grpc/grpcClients');
const { connectRabbitMQ } = require('./events/rabbitmq');
const { startGrpcServer } = require('./grpc/orderServer');
const errorHandler = require('./middlewares/errorHandler');

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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'order-service',
    database: 'postgresql',
    grpc: 'enabled',
    timestamp: new Date().toISOString(),
  });
});

// ── Connect Services ───────────────────────────────────────
connectRabbitMQ();
startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Order Service REST API running on port ${PORT}`));
