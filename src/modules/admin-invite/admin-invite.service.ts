import AdminInvite, { generateInviteToken } from '@models/AdminInvite.model';
import Admin from '@models/Admin.model';
import { NotFoundError, ValidationError } from '@shared/errors';
import { emailService } from '@services/email.service';
import logger from '@config/logger';

const INVITE_EXPIRES_DAYS = 7;

export class AdminInviteService {
  async createInvite(email: string, createdBy: string) {
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      throw new ValidationError('Администратор с таким email уже существует');
    }

    const existingPending = await AdminInvite.findOne({
      email: email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (existingPending) {
      throw new ValidationError('Приглашение на этот email уже отправлено');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRES_DAYS);
    const token = generateInviteToken();

    const invite = new AdminInvite({
      email: email.toLowerCase(),
      token,
      expiresAt,
      createdBy,
      status: 'pending',
    });
    await invite.save();

    logger.info(`Admin invite created for ${email} by ${createdBy}`);

    const inviteLink = `${process.env.ADMIN_APP_URL || 'http://localhost:5173'}/invite/${invite.token}`;

    // Send invite email (non-blocking — don't fail if email fails)
    emailService.sendInviteEmail(email, inviteLink).catch((err) => {
      logger.error(`Failed to send invite email to ${email}:`, err);
    });

    return {
      invite: {
        id: invite._id,
        email: invite.email,
        token: invite.token,
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
      inviteLink,
    };
  }

  async listPendingInvites() {
    const invites = await AdminInvite.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name username');
    return invites.map((inv) => ({
      id: inv._id,
      email: inv.email,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      createdBy: inv.createdBy,
    }));
  }

  async getInviteByToken(token: string) {
    const invite = await AdminInvite.findOne({ token, status: 'pending' });
    if (!invite) {
      throw new NotFoundError('Приглашение не найдено или уже использовано');
    }
    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw new ValidationError('Срок действия приглашения истёк');
    }
    return {
      email: invite.email,
      expiresAt: invite.expiresAt,
    };
  }

  async acceptInvite(token: string, data: { password: string; name?: string; username?: string }) {
    const invite = await AdminInvite.findOne({ token, status: 'pending' });
    if (!invite) {
      throw new NotFoundError('Приглашение не найдено или уже использовано');
    }
    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw new ValidationError('Срок действия приглашения истёк');
    }

    const username = data.username || invite.email.split('@')[0];
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      throw new ValidationError('Пользователь с таким логином уже существует');
    }

    const admin = new Admin({
      username,
      password: data.password,
      name: data.name || username,
      email: invite.email,
      role: 'admin',
    });
    await admin.save();

    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    await invite.save();

    logger.info(`Admin invite accepted: ${invite.email} -> admin ${admin._id}`);

    return {
      success: true,
      message: 'Аккаунт создан. Войдите с логином и паролем.',
      username: admin.username,
    };
  }
}

export const adminInviteService = new AdminInviteService();
