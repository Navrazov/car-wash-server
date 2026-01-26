import { Router } from 'express';
import { boxController } from './box.controller';

const router = Router();

// Admin routes
router.get('/', boxController.getAll);
router.get('/:id', boxController.getById);
router.post('/', boxController.create);
router.put('/:id', boxController.update);
router.delete('/:id', boxController.delete);

// Location-specific routes
router.get('/location/:locationId', boxController.getByLocation);
router.get('/location/:locationId/status', boxController.getBoxesStatus);
router.get('/location/:locationId/available', boxController.getAvailableBoxes);

export default router;




