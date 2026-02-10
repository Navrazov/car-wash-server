import nodemailer from 'nodemailer';
import logger from '@config/logger';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT) || 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        logger.warn('SMTP not configured — emails will not be sent');
        return null;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  async sendInviteEmail(email: string, inviteLink: string): Promise<boolean> {
    const transport = this.getTransporter();
    if (!transport) {
      logger.warn(`SMTP not configured, invite link for ${email}: ${inviteLink}`);
      return false;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
      await transport.sendMail({
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

      logger.info(`Invite email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send invite email to ${email}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
