import Admin from '@models/Admin.model';
import Location from '@models/Location.model';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import logger from '@config/logger';

export class AdminManagementService {
  async getAllAdmins() {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });

    const adminsWithLocationCount = await Promise.all(
      admins.map(async (admin) => {
        const locationCount = await Location.countDocuments({ adminId: admin._id });
        return {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          maxLocations: admin.maxLocations,
          locationCount,
          isActive: admin.isActive,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt,
        };
      })
    );

    return adminsWithLocationCount;
  }

  async updateAdmin(adminId: string, data: { maxLocations?: number; isActive?: boolean }) {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Администратор');
    }

    if (admin.role === 'super_admin') {
      throw new ForbiddenError('Нельзя изменять супер-администратора');
    }

    if (data.maxLocations !== undefined) {
      if (data.maxLocations < 1) {
        throw new ValidationError('Минимальное количество локаций: 1');
      }
      admin.maxLocations = data.maxLocations;
    }

    if (data.isActive !== undefined) {
      admin.isActive = data.isActive;
    }

    await admin.save();
    logger.info(`Admin ${adminId} updated: ${JSON.stringify(data)}`);

    const locationCount = await Location.countDocuments({ adminId: admin._id });

    return {
      id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      maxLocations: admin.maxLocations,
      locationCount,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
    };
  }
}

export const adminManagementService = new AdminManagementService();
