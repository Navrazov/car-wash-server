import { Router } from 'express';
import {
  getStats,
  getAllBookings,
  updateBookingStatus,
  getAllCustomers,
  getCustomerById,
  createLocation,
  getLocations,
  updateLocation,
  deleteLocation,
  createService,
  getServices,
  updateService,
  deleteService,
} from '@controllers/admin.controller';
import { authenticateAdmin } from '@middlewares/auth.middleware';
import { boxRoutes } from '../modules/box';
import { reportsRoutes } from '../modules/reports';

const router = Router();

// Все маршруты требуют авторизации администратора
router.use(authenticateAdmin);

/**
 * Статистика
 */
router.get('/stats', getStats);

/**
 * Бронирования
 */
router.get('/bookings', getAllBookings);
router.put('/bookings/:id', updateBookingStatus);

/**
 * Клиенты
 */
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerById);

/**
 * Локации
 */
router.post('/locations', createLocation);
router.get('/locations', getLocations);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

/**
 * Услуги
 */
router.post('/services', createService);
router.get('/services', getServices);
router.put('/services/:id', updateService);
router.delete('/services/:id', deleteService);

/**
 * Боксы
 */
router.use('/boxes', boxRoutes);

/**
 * Отчёты
 */
router.use('/reports', reportsRoutes);

export default router;
