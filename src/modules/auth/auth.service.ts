import User from '@models/User.model';
import smsService from '@services/sms.service';
import telegramGatewayService from '@services/telegramGateway.service';
import { generateUserToken, generateRefreshToken } from '@shared/utils';
import { NotFoundError, ValidationError } from '@shared/errors';
import logger from '@config/logger';

export class AuthService {
  async sendVerificationCode(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const code = smsService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      user = new User({ phone: cleanPhone });
    }
    user.verificationCode = code;
    user.verificationCodeExpires = expiresAt;
    await user.save();

    // 1. Пробуем отправить через Telegram Gateway
    let channel: 'telegram' | 'sms' = 'telegram';
    let sent = await telegramGatewayService.sendVerificationCode(cleanPhone, code);
    if (!sent) {
      // 2. Если не вышло — отправляем SMS
      sent = await smsService.sendVerificationCode(cleanPhone, code);
      channel = 'sms';
    }
    if (!sent) {
      throw new Error('Ошибка отправки кода (Telegram/SMS)');
    }

    logger.info(`Verification code sent to ${cleanPhone} via ${channel}`);

    // В dev режиме (без SMS_API_ID) возвращаем код для UI, +инфо о канале
    const isDev = !process.env.SMS_API_ID;
    return {
      expiresIn: 300,
      channel,
      ...(isDev && { devCode: code })
    };
  }

  async verifyCode(phone: string, code: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      throw new NotFoundError('Пользователь');
    }

    if (user.verificationCode !== code) {
      throw new ValidationError('Неверный код подтверждения');
    }

    if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
      throw new ValidationError('Код истек, запросите новый');
    }

    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const accessToken = generateUserToken({ id: user._id.toString(), phone: user.phone });
    const refreshToken = generateRefreshToken(user._id.toString());

    logger.info(`User authenticated: ${cleanPhone}`);

    return {
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
        totalVisits: user.totalVisits,
        totalSpent: user.totalSpent,
        rating: user.rating ?? 100,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('Пользователь');
    }
    return {
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      carModel: user.carModel,
      carNumber: user.carNumber,
      cars: user.cars || [],
      totalVisits: user.totalVisits,
      totalSpent: user.totalSpent,
      rating: user.rating ?? 100,
    };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; carModel?: string; carNumber?: string }) {
    const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
    if (!user) {
      throw new NotFoundError('Пользователь');
    }
    return {
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      carModel: user.carModel,
      carNumber: user.carNumber,
      cars: user.cars || [],
    };
  }
}

export const authService = new AuthService();
