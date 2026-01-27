import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const reviewController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      const { bookingId, employeeRating, locationRating, employeeComment, locationComment } = req.body;

      if (!bookingId || !locationRating) {
        return res.status(400).json({ error: 'bookingId и locationRating обязательны' });
      }

      if (locationRating < 1 || locationRating > 5) {
        return res.status(400).json({ error: 'locationRating должен быть от 1 до 5' });
      }

      if (employeeRating && (employeeRating < 1 || employeeRating > 5)) {
        return res.status(400).json({ error: 'employeeRating должен быть от 1 до 5' });
      }

      const review = await reviewService.create({
        userId,
        bookingId,
        employeeRating,
        locationRating,
        employeeComment,
        locationComment,
      });

      res.status(201).json(review);
    } catch (error: any) {
      next(error);
    }
  },

  async getByBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;
      const review = await reviewService.getByBooking(bookingId);
      res.json(review);
    } catch (error) {
      next(error);
    }
  },

  async getByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const { limit } = req.query;
      const reviews = await reviewService.getByEmployee(employeeId, limit ? parseInt(limit as string) : 10);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  },

  async getByLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId } = req.params;
      const { limit } = req.query;
      const reviews = await reviewService.getByLocation(locationId, limit ? parseInt(limit as string) : 10);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  },

  async getEmployeeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const stats = await reviewService.getEmployeeStats(employeeId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },

  async getLocationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId } = req.params;
      const stats = await reviewService.getLocationStats(locationId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },

  async getAllLocationsWithRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const locations = await reviewService.getAllLocationsWithRatings();
      res.json(locations);
    } catch (error) {
      next(error);
    }
  },

  async getAllEmployeesWithRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const employees = await reviewService.getAllEmployeesWithRatings();
      res.json(employees);
    } catch (error) {
      next(error);
    }
  },
};
