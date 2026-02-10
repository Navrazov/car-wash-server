import { Resend } from 'resend';
import logger from '@config/logger';

class EmailService {
  private resend: Resend | null = null;

  private getClient(): Resend | null {
    if (!this.resend) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        logger.warn('RESEND_API_KEY not configured — emails will not be sent');
        return null;
      }
      this.resend = new Resend(apiKey);
    }
    return this.resend;
  }

  async sendInviteEmail(email: string, inviteLink: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      logger.warn(`Email not configured, invite link for ${email}: ${inviteLink}`);
      return false;
    }

    const from = process.env.RESEND_FROM || 'АвтоМойка <onboarding@resend.dev>';

    try {
      const { error } = await client.emails.send({
        from,
        to: email,
        subject: 'Приглашение в панель управления АвтоМойка',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0d9488;">АвтоМойка</h2>
            <p>Вы приглашены стать администратором автомойки.</p>
            <p>Для создания аккаунта перейдите по ссылке:</p>
            <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: #fff; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Создать аккаунт
            </a>
            <p style="color: #888; font-size: 13px;">Ссылка действительна 7 дней.</p>
          </div>
        `,
      });

      if (error) {
        logger.error(`Failed to send invite email to ${email}:`, error);
        return false;
      }

      logger.info(`Invite email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send invite email to ${email}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
