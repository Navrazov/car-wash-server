import axios from 'axios';
import logger from '@config/logger';

const TELEGRAM_GATEWAY_URL = 'https://gateway.telegram.org/api/sendVerificationMessage';
const TELEGRAM_GATEWAY_TOKEN = process.env.TELEGRAM_GATEWAY_TOKEN;

class TelegramGatewayService {
  async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    if (!TELEGRAM_GATEWAY_TOKEN) {
      logger.warn('TELEGRAM_GATEWAY_TOKEN не задан, Telegram отправка кода выключена');
      return false;
    }
    try {
      // Подстройте payload под документацию Telegram Gateway — пример:
      const resp = await axios.post(
        TELEGRAM_GATEWAY_URL,
        {
          phone, // В E.164 формате, например +79991234567
          code,  // Ваш код авторизации
        },
        {
          headers: { Authorization: `Bearer ${TELEGRAM_GATEWAY_TOKEN}` }
        }
      );

      if (resp.data.status === 'sent') {
        logger.info(`Telegram message sent to ${phone}`);
        return true;
      }
      if (resp.data.error === 'USER_NOT_FOUND') {
        logger.info(`Telegram USER_NOT_FOUND for phone ${phone}`);
        return false;
      }
      logger.warn(`Telegram unknown response for ${phone}:`, resp.data);
      return false;
    } catch (error: any) {
      if (error?.response?.data?.error === 'USER_NOT_FOUND') {
        logger.info(`Telegram USER_NOT_FOUND (exception) for phone ${phone}`);
        return false;
      }
      logger.error('TelegramGateway Error sending code:', error);
      return false;
    }
  }
}

export default new TelegramGatewayService();
