import Admin from '@models/Admin.model';
import Location from '@models/Location.model';
import { generateAdminToken } from '@shared/utils';
import { NotFoundError, UnauthorizedError, ValidationError } from '@shared/errors';
import logger from '@config/logger';

export class AdminService {
  async login(username: string, password: string) {
    const admin = await Admin.findOne({ username, isActive: true });

    if (!admin) {
      throw new UnauthorizedError('Неверный логин или пароль');
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Неверный логин или пароль');
    }

    admin.lastLogin = new Date();
    await admin.save();

    const accessToken = generateAdminToken({
      id: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    });

    logger.info(`Admin logged in: ${username}`);

    return {
      accessToken,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        maxLocations: admin.maxLocations,
      },
    };
  }

  async getProfile(adminId: string) {
    const admin = await Admin.findById(adminId).select('-password');

    if (!admin) {
      throw new NotFoundError('Администратор');
    }

    const locationCount = await Location.countDocuments({ adminId: admin._id });

    return {
      id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      maxLocations: admin.maxLocations,
      locationCount,
      lastLogin: admin.lastLogin,
    };
  }

  async createAdmin(data: { username: string; password: string; name: string; email?: string; role?: string }) {
    const existingAdmin = await Admin.findOne({ username: data.username });

    if (existingAdmin) {
      throw new ValidationError('Администратор с таким username уже существует');
    }

    const admin = new Admin({
      username: data.username,
      password: data.password,
      name: data.name,
      email: data.email,
      role: data.role || 'admin',
    });

    await admin.save();

    logger.info(`New admin created: ${data.username}`);

    return {
      id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }
}

export const adminService = new AdminService();


