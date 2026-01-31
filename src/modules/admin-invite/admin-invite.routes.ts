import { Router } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '@middlewares/auth.middleware';
import { adminInviteController } from './admin-invite.controller';

const router = Router();

router.post('/', authenticateAdmin, requireSuperAdmin, adminInviteController.createInvite);
router.get('/', authenticateAdmin, requireSuperAdmin, adminInviteController.listInvites);

export default router;
