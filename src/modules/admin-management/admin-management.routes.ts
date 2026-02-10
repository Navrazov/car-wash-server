import { Router } from 'express';
import { adminManagementController } from './admin-management.controller';

const router = Router();

router.get('/', adminManagementController.getAll);
router.put('/:id', adminManagementController.update);

export default router;
