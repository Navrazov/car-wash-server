import axios from 'axios';
import crypto from 'crypto';
import logger from '@config/logger';

interface TinkoffInitPaymentResponse {
  Success: boolean;
  ErrorCode?: string;
  Message?: string;
  TerminalKey?: string;
  Amount?: number;
  OrderId?: string;
  PaymentId?: string;
  PaymentURL?: string;
}

interface TinkoffPaymentStatus {
  Success: boolean;
  ErrorCode?: string;
  Message?: string;
  PaymentId?: string;
  Status?: string;
  Amount?: number;
}

class PaymentService {
  private terminalKey: string;
  private secretKey: string;
  private apiUrl: string;

  constructor() {
    this.terminalKey = process.env.TINKOFF_TERMINAL_KEY || '';
    this.secretKey = process.env.TINKOFF_SECRET_KEY || '';
    this.apiUrl = process.env.TINKOFF_PAYMENT_URL || 'https://securepay.tinkoff.ru/v2/';

    if (!this.terminalKey || !this.secretKey) {
      logger.warn('⚠️  Tinkoff payment credentials not configured. Payment system will be disabled.');
    }
  }

  /**
   * Генерирует токен для запроса Тинькофф
   */
  private generateToken(params: Record<string, any>): string {
    const values: Record<string, any> = {
      ...params,
      Password: this.secretKey,
    };

    // Удаляем ненужные поля
    delete values.Token;
    delete values.Receipt;
    delete values.DATA;

    // Сортируем по ключам
    const sortedKeys = Object.keys(values).sort();
    const concatenated = sortedKeys.map((key) => values[key]).join('');

    return crypto.createHash('sha256').update(concatenated).digest('hex');
  }

  /**
   * Инициализация платежа
   */
  async initPayment(
    orderId: string,
    amount: number,
    description: string,
    customerPhone?: string,
    customerEmail?: string
  ): Promise<{ success: boolean; paymentUrl?: string; paymentId?: string; error?: string }> {
    if (!this.terminalKey || !this.secretKey) {
      logger.warn('Payment disabled. Mock payment initialized.');
      return {
        success: true,
        paymentUrl: 'https://mock-payment-url.com',
        paymentId: `MOCK_${orderId}`,
      };
    }

    try {
      const params: Record<string, any> = {
        TerminalKey: this.terminalKey,
        Amount: amount * 100, // Тинькофф принимает сумму в копейках
        OrderId: orderId,
        Description: description,
      };

      if (customerPhone) {
        params.Phone = customerPhone;
      }

      if (customerEmail) {
        params.Email = customerEmail;
      }

      params.Token = this.generateToken(params);

      const response = await axios.post<TinkoffInitPaymentResponse>(
        `${this.apiUrl}Init`,
        params
      );

      if (response.data.Success) {
        logger.info(`Payment initialized for order ${orderId}: ${response.data.PaymentId}`);
        return {
          success: true,
          paymentUrl: response.data.PaymentURL,
          paymentId: response.data.PaymentId,
        };
      } else {
        logger.error(`Payment initialization failed for order ${orderId}:`, response.data);
        return {
          success: false,
          error: response.data.Message || 'Ошибка инициализации платежа',
        };
      }
    } catch (error: any) {
      logger.error('Error initializing payment:', error);
      return {
        success: false,
        error: error.message || 'Ошибка связи с платежной системой',
      };
    }
  }

  /**
   * Проверка статуса платежа
   */
  async checkPaymentStatus(
    paymentId: string
  ): Promise<{ success: boolean; status?: string; amount?: number; error?: string }> {
    if (!this.terminalKey || !this.secretKey) {
      logger.warn('Payment disabled. Mock payment status check.');
      return {
        success: true,
        status: 'CONFIRMED',
        amount: 100,
      };
    }

    try {
      const params = {
        TerminalKey: this.terminalKey,
        PaymentId: paymentId,
      };

      const token = this.generateToken(params);

      const response = await axios.post<TinkoffPaymentStatus>(
        `${this.apiUrl}GetState`,
        {
          ...params,
          Token: token,
        }
      );

      if (response.data.Success) {
        return {
          success: true,
          status: response.data.Status,
          amount: response.data.Amount ? response.data.Amount / 100 : undefined,
        };
      } else {
        logger.error(`Failed to check payment status for ${paymentId}:`, response.data);
        return {
          success: false,
          error: response.data.Message || 'Ошибка проверки статуса платежа',
        };
      }
    } catch (error: any) {
      logger.error('Error checking payment status:', error);
      return {
        success: false,
        error: error.message || 'Ошибка связи с платежной системой',
      };
    }
  }

  /**
   * Отмена платежа (возврат средств)
   */
  async cancelPayment(
    paymentId: string,
    amount?: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.terminalKey || !this.secretKey) {
      logger.warn('Payment disabled. Mock payment cancellation.');
      return { success: true };
    }

    try {
      const params: Record<string, any> = {
        TerminalKey: this.terminalKey,
        PaymentId: paymentId,
      };

      if (amount) {
        params.Amount = amount * 100; // в копейках
      }

      params.Token = this.generateToken(params);

      const response = await axios.post(`${this.apiUrl}Cancel`, params);

      if (response.data.Success) {
        logger.info(`Payment cancelled for ${paymentId}`);
        return { success: true };
      } else {
        logger.error(`Failed to cancel payment ${paymentId}:`, response.data);
        return {
          success: false,
          error: response.data.Message || 'Ошибка отмены платежа',
        };
      }
    } catch (error: any) {
      logger.error('Error cancelling payment:', error);
      return {
        success: false,
        error: error.message || 'Ошибка связи с платежной системой',
      };
    }
  }
}

export default new PaymentService();
