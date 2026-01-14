import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { connectToDatabase } from './src/config/database';
import { configureMiddleware } from './src/middlewares';
import { configureRoutes } from './src/routes';
import logger from './src/config/logger';

// Validate required environment variables
const requiredEnvVars = ['PORT', 'SECRET_ACCESS_JWT', 'SECRET_REFRESH_JWT', 'MONGODB'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();

// Configure middleware
configureMiddleware(app);

// Configure routes
configureRoutes(app);

// Connect to database
connectToDatabase();

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`🚗 Car Wash Server running on port ${PORT}`);
  logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
  logger.info(`📱 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
