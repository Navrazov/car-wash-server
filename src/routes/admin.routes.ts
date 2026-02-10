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
import { authenticateAdmin, requireSuperAdmin } from '@middlewares/auth.middleware';
import { boxRoutes } from '../modules/box';
import { reportsRoutes } from '../modules/reports';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../modules/employee';
import { updateCustomer, deleteCustomer } from '../modules/customer';
import { employeeScheduleRoutes } from '../modules/employee-schedule';
import { reviewRoutes as adminReviewRoutes } from '../modules/review';
import { adminInviteRoutes } from '../modules/admin-invite';
import { adminManagementRoutes } from '../modules/admin-management';

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
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

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

/**
 * Сотрудники
 */
router.post('/employees', createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

/**
 * Расписание сотрудников
 */
router.use('/employee-schedules', employeeScheduleRoutes);

/**
 * Отзывы и рейтинги (админ)
 */
router.use('/reviews', adminReviewRoutes);

/**
 * Управление администраторами (только super_admin)
 */
router.use('/admins', requireSuperAdmin, adminManagementRoutes);

/**
 * Приглашения админов (только super_admin)
 */
router.use('/invites', adminInviteRoutes);

export default router;
