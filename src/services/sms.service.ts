import axios from 'axios';
import logger from '@config/logger';

class SMSService {
  private apiId: string;
  private apiUrl: string = 'https://sms.ru/sms/send';
  private sender: string;

  constructor() {
    this.apiId = process.env.SMS_API_ID || '';
    this.sender = process.env.SMS_SENDER || 'CARWASH';
    
    if (!this.apiId) {
      logger.warn('⚠️  SMS_API_ID not configured. SMS sending will be disabled.');
    }
  }

  /**
   * Генерирует 4-значный код подтверждения
   */
  generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Отправляет SMS с кодом подтверждения
   */
  async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    if (!this.apiId) {
      logger.warn(`SMS sending disabled. Verification code for ${phone}: ${code}`);
      console.log(`\n🔑 Verification code for ${phone}: ${code}\n`);
      return true; // В dev режиме возвращаем успех
    }

    try {
      const message = `Ваш код подтверждения: ${code}`;
      
      const response = await axios.get(this.apiUrl, {
        params: {
          api_id: this.apiId,
          to: phone,
          msg: message,
          from: this.sender,
          json: 1,
        },
      });

      if (response.data.status === 'OK') {
        logger.info(`SMS sent successfully to ${phone}`);
        return true;
      } else {
        logger.error(`Failed to send SMS to ${phone}:`, response.data);
        return false;
      }
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Отправляет SMS уведомление о бронировании
   */
  async sendBookingNotification(
    phone: string,
    bookingDate: string,
    bookingTime: string
  ): Promise<boolean> {
    if (!this.apiId) {
      logger.warn(`SMS sending disabled. Booking notification for ${phone}`);
      return true;
    }

    try {
      const message = `Ваше бронирование на ${bookingDate} в ${bookingTime} подтверждено. Автомойка CarWash`;
      
      const response = await axios.get(this.apiUrl, {
        params: {
          api_id: this.apiId,
          to: phone,
          msg: message,
          from: this.sender,
          json: 1,
        },
      });

      return response.data.status === 'OK';
    } catch (error) {
      logger.error('Error sending booking notification:', error);
      return false;
    }
  }
}

export default new SMSService();
