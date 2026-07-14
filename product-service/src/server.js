require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { startGrpcServer } = require('./grpc/productServer');
const { connectRabbitMQ } = require('./events/rabbitmq');
const { connectMongoDB } = require('./utils/mongoClient');
const errorHandler = require('./middlewares/errorHandler');

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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'product-service',
    database: 'mongodb',
    cache: 'redis',
    timestamp: new Date().toISOString(),
  });
});

// ── Connect to Databases ───────────────────────────────────
connectMongoDB();
connectRabbitMQ();
startGrpcServer();

// ── REST API Routes ────────────────────────────────────────
const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Product Service REST API running on port ${PORT}`));
