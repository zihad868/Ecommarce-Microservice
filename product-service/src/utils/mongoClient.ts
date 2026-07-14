import mongoose from 'mongoose';

export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUrl =
      process.env.MONGODB_URL || 'mongodb://localhost:27017/product_db';

    await mongoose.connect(mongoUrl, {
      // Connection pool for high concurrency (10M users)
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Product Service: MongoDB connected');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Product Service: MongoDB connection failed:', errMsg);
    // Retry after 5 seconds
    setTimeout(() => void connectMongoDB(), 5000);
  }
};
