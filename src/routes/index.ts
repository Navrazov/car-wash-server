import { Express, Router } from 'express';
import { authRoutes, adminRoutes, bookingRoutes } from '@modules/index';
import {
  getLocations,
  getPublicLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from '@modules/location';
import {
  getServices,
  getPublicServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '@modules/service';
import { getAllCustomers, getCustomerById } from '@modules/customer';
import { getStats } from '@modules/stats';
import { getAllBookings, updateBookingStatus } from '@modules/booking';
import { authenticateAdmin } from '@middlewares/auth.middleware';
import { errorHandler } from '@middlewares/error.middleware';

const createAdminRouter = (): Router => {
  const router = Router();
  router.use(authenticateAdmin);

  // Stats
  router.get('/stats', getStats);

  // Bookings
  router.get('/bookings', getAllBookings);
  router.put('/bookings/:id', updateBookingStatus);

  // Customers
  router.get('/customers', getAllCustomers);
  router.get('/customers/:id', getCustomerById);

  // Locations
  router.post('/locations', createLocation);
  router.get('/locations', getLocations);
  router.put('/locations/:id', updateLocation);
  router.delete('/locations/:id', deleteLocation);

  // Services
  router.post('/services', createService);
  router.get('/services', getServices);
  router.put('/services/:id', updateService);
  router.delete('/services/:id', deleteService);

  return router;
};

const createPublicRouter = (): Router => {
  const router = Router();

  router.get('/locations', getPublicLocations);
  router.get('/locations/:id', getLocationById);
  router.get('/services', getPublicServices);
  router.get('/services/:id', getServiceById);

  return router;
};

export const configureRoutes = (app: Express): void => {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin/auth', adminRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/admin', createAdminRouter());
  app.use('/api/public', createPublicRouter());

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handler
  app.use(errorHandler);
};
