import { Router } from 'express';
import { reportsController } from './reports.controller';

const router = Router();

router.get('/boxes', reportsController.getBoxesReport);
router.get('/employees', reportsController.getEmployeesReport);
router.get('/locations', reportsController.getLocationReports);
router.get('/revenue', reportsController.getRevenueByPeriod);
router.get('/top-boxes', reportsController.getTopBoxes);
router.get('/top-employees', reportsController.getTopEmployees);
router.get('/summary', reportsController.getSummary);

export default router;




