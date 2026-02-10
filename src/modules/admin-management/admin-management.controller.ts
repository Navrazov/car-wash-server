import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import { adminManagementService } from './admin-management.service';

export const adminManagementController = {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const admins = await adminManagementService.getAllAdmins();
      res.json(admins);
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { maxLocations, isActive } = req.body;
      const updated = await adminManagementService.updateAdmin(id, { maxLocations, isActive });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
};
