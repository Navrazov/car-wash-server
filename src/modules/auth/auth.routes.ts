import { Router } from 'express';
import { sendVerificationCode, verifyCode, getProfile, updateProfile } from './auth.controller';
import { authenticateUser } from '@middlewares/auth.middleware';

const router = Router();

router.post('/send-code', sendVerificationCode);
router.post('/verify-code', verifyCode);
router.get('/profile', authenticateUser, getProfile);
router.put('/profile', authenticateUser, updateProfile);

export default router;

