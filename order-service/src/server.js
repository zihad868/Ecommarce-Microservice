const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Order = require('./models/Order');
const { getProductDetails } = require('./grpc/grpcClients');
const { connectRabbitMQ, publishEvent } = require('./events/rabbitmq');
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/authMiddleware');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce-order')
  .then(() => console.log('Order Service MongoDB Connected'))
  .catch(err => console.error(err));

// Connect to RabbitMQ
connectRabbitMQ();

const orderRoutes = require('./routes/orderRoutes');

// REST API Routes
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Order Service REST API running on port ${PORT}`));
