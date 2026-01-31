import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import { adminInviteService } from './admin-invite.service';
export const adminInviteController = {
  async createInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const createdBy = req.admin!.id;
      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email обязателен' });
        return;
      }
      const result = await adminInviteService.createInvite(email.trim(), createdBy);
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  },

  async listInvites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invites = await adminInviteService.listPendingInvites();
      res.json(invites);
    } catch (error: any) {
      next(error);
    }
  },

  async getInviteByToken(req: any, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const invite = await adminInviteService.getInviteByToken(token);
      res.json(invite);
    } catch (error: any) {
      next(error);
    }
  },

  async acceptInvite(req: any, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const { password, name, username } = req.body;
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'Пароль обязателен (минимум 6 символов)' });
        return;
      }
      const result = await adminInviteService.acceptInvite(token, { password, name, username });
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  },
};
