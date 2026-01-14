import { Router } from 'express';
import {
  adminLogin,
  getAdminProfile,
  createAdmin,
} from '@controllers/admin-auth.controller';
import { authenticateAdmin, requireSuperAdmin } from '@middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/admin/auth/login
 * @desc    Вход администратора
 * @access  Public
 */
router.post('/login', adminLogin);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Получить профиль текущего администратора
 * @access  Private (Admin)
 */
router.get('/profile', authenticateAdmin, getAdminProfile);

/**
 * @route   POST /api/admin/auth/create
 * @desc    Создать нового администратора
 * @access  Private (Super Admin)
 */
router.post('/create', authenticateAdmin, requireSuperAdmin, createAdmin);

export default router;
