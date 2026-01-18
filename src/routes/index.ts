import { Express, Router } from 'express';
import { authRoutes, adminRoutes, bookingRoutes } from '@modules/index';
import {
  getPublicLocations,
  getLocationById,
} from '@modules/location';
import {
  getPublicServices,
  getServiceById,
} from '@modules/service';
import { errorHandler } from '@middlewares/error.middleware';
import adminRouter from './admin.routes';
import publicRouter from './public.routes';

export const configureRoutes = (app: Express): void => {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin/auth', adminRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/admin', adminRouter);
  app.use('/api/public', publicRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handler
  app.use(errorHandler);
};
