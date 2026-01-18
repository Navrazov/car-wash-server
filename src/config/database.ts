import mongoose from 'mongoose';
import logger from './logger';
import { seedDatabase } from './seed-data';

let mongoServer: any = null;

export const connectToDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB;
  const useMemoryServer = !mongoUri || mongoUri === 'memory' || process.env.USE_MEMORY_DB === 'true';

  try {
    if (useMemoryServer) {
      // Use in-memory MongoDB for development
      logger.info('🔧 Starting in-memory MongoDB server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      logger.info('✅ Connected to in-memory MongoDB (dev mode)');
      logger.info('⚠️  Data will be lost when server restarts');
      
      // Auto-seed in memory mode
      await seedDatabase();
    } else {
      // Use external MongoDB
      await mongoose.connect(mongoUri);
      logger.info('✅ Successfully connected to MongoDB');
    }
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err);
    
    // Try fallback to memory server
    if (!useMemoryServer) {
      logger.info('🔄 Falling back to in-memory MongoDB...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        await mongoose.connect(memoryUri);
        logger.info('✅ Connected to in-memory MongoDB (fallback)');
        logger.info('⚠️  Data will be lost when server restarts');
        return;
      } catch (memErr) {
        logger.error('❌ Failed to start in-memory MongoDB:', memErr);
        process.exit(1);
      }
    }
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

export const stopDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};
