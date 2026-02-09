import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '@models/User.model';
import smsService from '@services/sms.service';
import logger from '@config/logger';

/**
 * Отправка кода подтверждения на телефон
 */
export const sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Номер телефона обязателен' });
      return;
    }

    // Очистка формата телефона
    const cleanPhone = phone.replace(/\D/g, '');

    // Генерируем код
    const code = smsService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

    // Находим или создаем пользователя
    let user = await User.findOne({ phone: cleanPhone });
    
    if (!user) {
      user = new User({ phone: cleanPhone });
    }

    user.verificationCode = code;
    user.verificationCodeExpires = expiresAt;
    await user.save();

    // Отправляем SMS
    const sent = await smsService.sendVerificationCode(cleanPhone, code);

    if (!sent) {
      res.status(500).json({ error: 'Ошибка отправки SMS' });
      return;
    }

    logger.info(`Verification code sent to ${cleanPhone}`);
    res.json({ 
      success: true, 
      message: 'Код подтверждения отправлен',
      expiresIn: 300 // секунды
    });
  } catch (error) {
    logger.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Проверка кода и выдача токена
 */
export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400).json({ error: 'Телефон и код обязательны' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Проверяем код
    if (user.verificationCode !== code) {
      res.status(400).json({ error: 'Неверный код подтверждения' });
      return;
    }

    // Проверяем срок действия
    if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
      res.status(400).json({ error: 'Код истек, запросите новый' });
      return;
    }

    // Очищаем код
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Генерируем токены
    const accessToken = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.SECRET_ACCESS_JWT!,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.SECRET_REFRESH_JWT!,
      { expiresIn: '30d' }
    );

    logger.info(`User authenticated: ${cleanPhone}`);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        carModel: user.carModel,
        carNumber: user.carNumber,
        cars: user.cars || [],
      },
    });
  } catch (error) {
    logger.error('Error verifying code:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Обновление профиля пользователя
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { name, email, carModel, carNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, carModel, carNumber },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        carModel: user.carModel,
        carNumber: user.carNumber,
        cars: user.cars || [],
      },
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Добавить автомобиль
 */
export const addCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { brand, model, plateNumber, year } = req.body;

    if (!brand || !model || !plateNumber) {
      res.status(400).json({ error: 'Марка, модель и госномер обязательны' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // If this is the first car, make it default
    const isDefault = user.cars.length === 0;

    user.cars.push({
      brand,
      model,
      plateNumber: plateNumber.toUpperCase(),
      year: year || undefined,
      isDefault,
    });

    // Also update legacy carModel/carNumber fields
    if (isDefault) {
      user.carModel = `${brand} ${model}`;
      user.carNumber = plateNumber.toUpperCase();
    }

    await user.save();

    res.json({ success: true, cars: user.cars });
  } catch (error) {
    logger.error('Error adding car:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Обновить автомобиль
 */
export const updateCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { carId } = req.params;
    const { brand, model, plateNumber, year } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const car = user.cars.id(carId);
    if (!car) {
      res.status(404).json({ error: 'Автомобиль не найден' });
      return;
    }

    if (brand) car.brand = brand;
    if (model) car.model = model;
    if (plateNumber) car.plateNumber = plateNumber.toUpperCase();
    if (year) car.year = year;

    // Update legacy fields if this is the default car
    if (car.isDefault) {
      user.carModel = `${car.brand} ${car.model}`;
      user.carNumber = car.plateNumber;
    }

    await user.save();

    res.json({ success: true, cars: user.cars });
  } catch (error) {
    logger.error('Error updating car:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Удалить автомобиль
 */
export const deleteCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { carId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const carIndex = user.cars.findIndex((c: any) => c._id.toString() === carId);
    if (carIndex === -1) {
      res.status(404).json({ error: 'Автомобиль не найден' });
      return;
    }

    const wasDefault = user.cars[carIndex].isDefault;
    user.cars.splice(carIndex, 1);

    // If we deleted the default car, make the first remaining car default
    if (wasDefault && user.cars.length > 0) {
      user.cars[0].isDefault = true;
      user.carModel = `${user.cars[0].brand} ${user.cars[0].model}`;
      user.carNumber = user.cars[0].plateNumber;
    } else if (user.cars.length === 0) {
      user.carModel = undefined;
      user.carNumber = undefined;
    }

    await user.save();

    res.json({ success: true, cars: user.cars });
  } catch (error) {
    logger.error('Error deleting car:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Установить автомобиль по умолчанию
 */
export const setDefaultCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { carId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    let found = false;
    for (const car of user.cars) {
      if ((car as any)._id.toString() === carId) {
        car.isDefault = true;
        user.carModel = `${car.brand} ${car.model}`;
        user.carNumber = car.plateNumber;
        found = true;
      } else {
        car.isDefault = false;
      }
    }

    if (!found) {
      res.status(404).json({ error: 'Автомобиль не найден' });
      return;
    }

    await user.save();

    res.json({ success: true, cars: user.cars });
  } catch (error) {
    logger.error('Error setting default car:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение профиля текущего пользователя
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      carModel: user.carModel,
      carNumber: user.carNumber,
      cars: user.cars || [],
      totalVisits: user.totalVisits,
      totalSpent: user.totalSpent,
    });
  } catch (error) {
    logger.error('Error getting profile:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
