const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { startGrpcServer } = require('./grpc/authServer');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use(cors());


// Start gRPC Server
startGrpcServer();

const authRoutes = require('./routes/authRoutes');

// REST API Routes
app.use('/api/auth', authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service REST API running on port ${PORT}`));
