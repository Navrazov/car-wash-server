import { Router } from 'express';
import { sendVerificationCode, verifyCode, getProfile, updateProfile } from './auth.controller';
import {
  addCar,
  updateCar,
  deleteCar,
  setDefaultCar,
} from '@controllers/auth.controller';
import { authenticateUser } from '@middlewares/auth.middleware';

const router = Router();

router.post('/send-code', sendVerificationCode);
router.post('/verify-code', verifyCode);
router.get('/profile', authenticateUser, getProfile);
router.put('/profile', authenticateUser, updateProfile);

/**
 * Автомобили пользователя
 */
router.post('/cars', authenticateUser, addCar);
router.put('/cars/:carId', authenticateUser, updateCar);
router.delete('/cars/:carId', authenticateUser, deleteCar);
router.put('/cars/:carId/default', authenticateUser, setDefaultCar);

export default router;


