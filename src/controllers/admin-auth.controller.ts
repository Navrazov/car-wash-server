import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '@models/Admin.model';
import logger from '@config/logger';

/**
 * Вход администратора
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Логин и пароль обязательны' });
      return;
    }

    const admin = await Admin.findOne({ username, isActive: true });

    if (!admin) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    // Обновляем время последнего входа
    admin.lastLogin = new Date();
    await admin.save();

    // Генерируем токен
    const accessToken = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        role: admin.role 
      },
      process.env.SECRET_ACCESS_JWT!,
      { expiresIn: '24h' }
    );

    logger.info(`Admin logged in: ${username}`);

    res.json({
      success: true,
      accessToken,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        locationId: admin.locationId,
      },
    });
  } catch (error) {
    logger.error('Error in admin login:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение информации о текущем администраторе
 */
export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;

    const admin = await Admin.findById(adminId).select('-password');

    if (!admin) {
      res.status(404).json({ error: 'Администратор не найден' });
      return;
    }

    res.json({
      id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      locationId: admin.locationId,
      lastLogin: admin.lastLogin,
    });
  } catch (error) {
    logger.error('Error getting admin profile:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Создание нового администратора (только super_admin)
 */
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, name, email, role, locationId } = req.body;

    if (!username || !password || !name) {
      res.status(400).json({ error: 'Username, password и name обязательны' });
      return;
    }

    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      res.status(400).json({ error: 'Администратор с таким username уже существует' });
      return;
    }

    const admin = new Admin({
      username,
      password,
      name,
      email,
      role: role || 'admin',
      locationId: locationId || undefined,
    });

    await admin.save();

    logger.info(`New admin created: ${username}`);

    res.status(201).json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        locationId: admin.locationId,
      },
    });
  } catch (error) {
    logger.error('Error creating admin:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
