import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';

export const reportsController = {
  async getBoxesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = 'month', locationId, startDate, endDate } = req.query;
      const report = await reportsService.getBoxesReport(
        period as 'week' | 'month' | 'quarter' | 'year' | 'custom',
        locationId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(report);
    } catch (error) {
      next(error);
    }
  },

  async getLocationReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      const reports = await reportsService.getLocationReports(
        period as 'week' | 'month' | 'quarter' | 'year' | 'custom',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(reports);
    } catch (error) {
      next(error);
    }
  },

  async getRevenueByPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupBy = 'day', period = 'month', locationId } = req.query;
      const data = await reportsService.getRevenueByPeriod(
        groupBy as 'day' | 'week' | 'month',
        period as 'week' | 'month' | 'quarter' | 'year',
        locationId as string
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  async getTopBoxes(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '5', period = 'month' } = req.query;
      const boxes = await reportsService.getTopBoxes(
        parseInt(limit as string, 10),
        period as 'week' | 'month' | 'quarter' | 'year'
      );
      res.json(boxes);
    } catch (error) {
      next(error);
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await reportsService.getSummary();
      res.json(summary);
    } catch (error) {
      next(error);
    }
  },
};




