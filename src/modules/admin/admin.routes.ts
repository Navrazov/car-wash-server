import { Router } from 'express';
import { adminLogin, getAdminProfile, createAdmin } from './admin.controller';
import { authenticateAdmin, requireSuperAdmin } from '@middlewares/auth.middleware';

const router = Router();

router.post('/login', adminLogin);
router.get('/profile', authenticateAdmin, getAdminProfile);
router.post('/create', authenticateAdmin, requireSuperAdmin, createAdmin);

export default router;


