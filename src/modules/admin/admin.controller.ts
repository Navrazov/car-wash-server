import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Логин и пароль обязательны' });
      return;
    }

    const result = await adminService.login(username, password);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getAdminProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const profile = await adminService.getProfile(adminId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, name, email, role } = req.body;

    if (!username || !password || !name) {
      res.status(400).json({ error: 'Username, password и name обязательны' });
      return;
    }

    const result = await adminService.createAdmin({ username, password, name, email, role });
    res.status(201).json({ success: true, admin: result });
  } catch (error) {
    next(error);
  }
};


