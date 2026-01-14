import mongoose from 'mongoose';
import logger from './logger';

export const connectToDatabase = async (): Promise<void> => {
  if (!process.env.MONGODB) {
    logger.error('MONGODB environment variable is not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB);
    logger.info('✅ Successfully connected to MongoDB');
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }

  // Handle connection events
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
};
