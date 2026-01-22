import { Response, NextFunction } from 'express';
import { statsService } from './stats.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await statsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};


