import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/errors';
import logger from '@config/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Ошибка сервера' });
};


