import { Express } from 'express';
import authRoutes from './auth.routes';
import adminAuthRoutes from './admin-auth.routes';
import bookingRoutes from './booking.routes';
import adminRoutes from './admin.routes';
import publicRoutes from './public.routes';

export const configureRoutes = (app: Express): void => {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/public', publicRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
};
