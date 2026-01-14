import { Router } from 'express';
import {
  sendVerificationCode,
  verifyCode,
  updateProfile,
  getProfile,
} from '@controllers/auth.controller';
import { authenticateUser } from '@middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/send-code
 * @desc    Отправить код подтверждения на телефон
 * @access  Public
 */
router.post('/send-code', sendVerificationCode);

/**
 * @route   POST /api/auth/verify-code
 * @desc    Проверить код и получить токен
 * @access  Public
 */
router.post('/verify-code', verifyCode);

/**
 * @route   GET /api/auth/profile
 * @desc    Получить профиль текущего пользователя
 * @access  Private
 */
router.get('/profile', authenticateUser, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Обновить профиль пользователя
 * @access  Private
 */
router.put('/profile', authenticateUser, updateProfile);

export default router;
