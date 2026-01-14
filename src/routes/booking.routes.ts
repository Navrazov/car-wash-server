import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  checkPaymentStatus,
  cancelBooking,
  getAvailableSlots,
} from '@controllers/booking.controller';
import { authenticateUser } from '@middlewares/auth.middleware';

const router = Router();

// Все маршруты требуют авторизации
router.use(authenticateUser);

/**
 * @route   GET /api/bookings/available-slots
 * @desc    Получить доступные слоты для бронирования
 * @access  Private
 */
router.get('/available-slots', getAvailableSlots);

/**
 * @route   POST /api/bookings
 * @desc    Создать новое бронирование
 * @access  Private
 */
router.post('/', createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Получить все бронирования пользователя
 * @access  Private
 */
router.get('/', getUserBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Получить детали конкретного бронирования
 * @access  Private
 */
router.get('/:id', getBookingById);

/**
 * @route   GET /api/bookings/:id/payment-status
 * @desc    Проверить статус оплаты бронирования
 * @access  Private
 */
router.get('/:id/payment-status', checkPaymentStatus);

/**
 * @route   POST /api/bookings/:id/cancel
 * @desc    Отменить бронирование
 * @access  Private
 */
router.post('/:id/cancel', cancelBooking);

export default router;
