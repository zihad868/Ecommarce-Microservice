const express = require('express');
const cors = require('cors');
const { getProductDetails } = require('./grpc/grpcClients');
const { connectRabbitMQ, publishEvent } = require('./events/rabbitmq');
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/authMiddleware');

const app = express();
app.use(express.json());
app.use(cors());



// Connect to RabbitMQ
connectRabbitMQ();

const orderRoutes = require('./routes/orderRoutes');

// REST API Routes
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Order Service REST API running on port ${PORT}`));
