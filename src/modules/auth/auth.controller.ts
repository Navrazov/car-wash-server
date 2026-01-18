import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const sendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Номер телефона обязателен' });
      return;
    }

    const result = await authService.sendVerificationCode(phone);
    res.json({ success: true, message: 'Код подтверждения отправлен', ...result });
  } catch (error) {
    next(error);
  }
};

export const verifyCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400).json({ error: 'Телефон и код обязательны' });
      return;
    }

    const result = await authService.verifyCode(phone, code);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const profile = await authService.getProfile(userId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const { name, email, carModel, carNumber } = req.body;
    const result = await authService.updateProfile(userId, { name, email, carModel, carNumber });
    res.json({ success: true, user: result });
  } catch (error) {
    next(error);
  }
};

