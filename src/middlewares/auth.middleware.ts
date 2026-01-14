import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '@config/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone?: string;
    role?: string;
  };
  admin?: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * Middleware для проверки JWT токена пользователя
 */
export const authenticateUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Токен не предоставлен' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_ACCESS_JWT!) as any;
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
    };
    next();
  } catch (error) {
    logger.error('JWT verification failed:', error);
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

/**
 * Middleware для проверки JWT токена администратора
 */
export const authenticateAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Токен не предоставлен' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_ACCESS_JWT!) as any;
    
    if (!decoded.role || !['admin', 'super_admin'].includes(decoded.role)) {
      res.status(403).json({ error: 'Доступ запрещен' });
      return;
    }

    req.admin = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (error) {
    logger.error('Admin JWT verification failed:', error);
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

/**
 * Middleware для проверки роли super_admin
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.admin || req.admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Требуются права супер-администратора' });
    return;
  }
  next();
};
