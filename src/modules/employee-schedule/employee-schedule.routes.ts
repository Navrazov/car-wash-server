import { Router } from 'express';
import { employeeScheduleController } from './employee-schedule.controller';
import { authenticateAdmin } from '@middlewares/auth.middleware';

const router = Router();

// All routes require admin authentication
router.use(authenticateAdmin);

router.post('/', employeeScheduleController.create);
router.put('/:id', employeeScheduleController.update);
router.delete('/:id', employeeScheduleController.delete);
router.get('/employee/:employeeId', employeeScheduleController.getByEmployee);
router.get('/box/:boxId', employeeScheduleController.getByBox);
router.get('/location/:locationId', employeeScheduleController.getByLocation);
router.get('/date', employeeScheduleController.getByDate);

export default router;
