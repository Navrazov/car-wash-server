import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  checkPaymentStatus,
  cancelBooking,
  getAvailableSlots,
} from './booking.controller';
import { authenticateUser } from '@middlewares/auth.middleware';

const router = Router();

router.use(authenticateUser);

router.get('/available-slots', getAvailableSlots);
router.post('/', createBooking);
router.get('/', getUserBookings);
router.get('/:id', getBookingById);
router.get('/:id/payment-status', checkPaymentStatus);
router.post('/:id/cancel', cancelBooking);

export default router;

