const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Product = require('./models/Product');
const { startGrpcServer } = require('./grpc/productServer');
const { connectRabbitMQ } = require('./events/rabbitmq');
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/authMiddleware');
const APIFeatures = require('./utils/apiFeatures');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce-product')
  .then(() => console.log('Product Service MongoDB Connected'))
  .catch(err => console.error(err));

// Start Servers/Consumers
startGrpcServer();
connectRabbitMQ();

const productRoutes = require('./routes/productRoutes');

// REST API Routes
app.use('/api/products', productRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Product Service REST API running on port ${PORT}`));
