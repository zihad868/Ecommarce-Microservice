const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/product_db';

    await mongoose.connect(mongoUrl, {
      // Connection pool for high concurrency (10M users)
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Product Service: MongoDB connected');
  } catch (err) {
    console.error('Product Service: MongoDB connection failed:', err.message);
    // Retry after 5 seconds (same pattern as RabbitMQ)
    setTimeout(connectMongoDB, 5000);
  }
};

module.exports = { connectMongoDB };
