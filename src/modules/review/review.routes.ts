import { Router } from 'express';
import { reviewController } from './review.controller';
import { authenticateUser } from '@middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/employee/:employeeId', reviewController.getByEmployee);
router.get('/location/:locationId', reviewController.getByLocation);
router.get('/employee/:employeeId/stats', reviewController.getEmployeeStats);
router.get('/location/:locationId/stats', reviewController.getLocationStats);
router.get('/booking/:bookingId', reviewController.getByBooking);
router.get('/locations/ratings', reviewController.getAllLocationsWithRatings);
router.get('/employees/ratings', reviewController.getAllEmployeesWithRatings);

// Protected routes (require authentication)
router.post('/', authenticateUser, reviewController.create);

export default router;
