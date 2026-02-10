import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Admin from '../src/models/Admin.model';
import logger from '../src/config/logger';

const createAdmin = async () => {
  try {
    if (!process.env.MONGODB) {
      throw new Error('MONGODB environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB);
    logger.info('Connected to MongoDB');

    // Проверяем, есть ли уже админ
    const existingAdmin = await Admin.findOne({ username: 'admin' });

    if (existingAdmin) {
      logger.info('Admin already exists, resetting password and ensuring super_admin role...');
      existingAdmin.role = 'super_admin';
      existingAdmin.isActive = true;
      existingAdmin.maxLocations = 999;
      existingAdmin.password = 'admin123';
      await existingAdmin.save();
      logger.info('✅ Admin updated successfully!');
    } else {
      const admin = new Admin({
        username: 'admin',
        password: 'admin123',
        name: 'Администратор',
        email: 'admin@carwash.ru',
        role: 'super_admin',
        maxLocations: 999,
      });
      await admin.save();
      logger.info('✅ Admin created successfully!');
    }

    logger.info('   Username: admin');
    logger.info('   Password: admin123');

    process.exit(0);
  } catch (error) {
    logger.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
