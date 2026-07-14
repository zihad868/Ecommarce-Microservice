const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./models/User');
const { startGrpcServer } = require('./grpc/authServer');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce-auth')
  .then(() => console.log('Auth Service MongoDB Connected'))
  .catch(err => console.error(err));

// Start gRPC Server
startGrpcServer();

const authRoutes = require('./routes/authRoutes');

// REST API Routes
app.use('/api/auth', authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service REST API running on port ${PORT}`));
