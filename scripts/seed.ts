import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Admin from '../src/models/Admin.model';
import Location from '../src/models/Location.model';
import Service from '../src/models/Service.model';
import logger from '../src/config/logger';

const seed = async () => {
  try {
    if (!process.env.MONGODB) {
      throw new Error('MONGODB environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB);
    logger.info('Connected to MongoDB');

    // Очищаем коллекции
    await Admin.deleteMany({});
    await Location.deleteMany({});
    await Service.deleteMany({});

    logger.info('Collections cleared');

    // Создаем администратора
    const admin = new Admin({
      username: 'admin',
      password: 'admin123',
      name: 'Администратор',
      email: 'admin@carwash.ru',
      role: 'super_admin',
    });
    await admin.save();
    logger.info('✅ Admin created (username: admin, password: admin123)');

    // Создаем локации
    const locations = [
      {
        name: 'Автомойка на Ленина',
        address: 'ул. Ленина, 45',
        phone: '+7 (999) 123-45-67',
        workingHours: '9:00 - 21:00',
        description: 'Современная автомойка в центре города',
        coordinates: {
          latitude: 55.7558,
          longitude: 37.6173,
        },
      },
      {
        name: 'Автомойка на Гагарина',
        address: 'пр. Гагарина, 12',
        phone: '+7 (999) 765-43-21',
        workingHours: '8:00 - 22:00',
        description: 'Быстрая мойка и детейлинг',
        coordinates: {
          latitude: 55.7600,
          longitude: 37.6200,
        },
      },
      {
        name: 'Автомойка на Мира',
        address: 'ул. Мира, 78',
        phone: '+7 (999) 111-22-33',
        workingHours: '9:00 - 20:00',
        description: 'Профессиональная мойка и полировка',
      },
    ];

    const createdLocations = await Location.insertMany(locations);
    logger.info(`✅ ${createdLocations.length} locations created`);

    // Создаем услуги
    const services = [
      {
        name: 'Экспресс-мойка',
        description: 'Быстрая мойка кузова снаружи',
        price: 500,
        duration: 30,
        category: 'wash',
      },
      {
        name: 'Стандартная мойка',
        description: 'Мойка кузова снаружи и внутри салона',
        price: 1000,
        duration: 60,
        category: 'wash',
      },
      {
        name: 'Комплексная мойка',
        description: 'Полная мойка + чернение шин + ароматизация',
        price: 1500,
        duration: 90,
        category: 'wash',
      },
      {
        name: 'Химчистка салона',
        description: 'Глубокая химчистка салона автомобиля',
        price: 3000,
        duration: 180,
        category: 'detailing',
      },
      {
        name: 'Полировка кузова',
        description: 'Профессиональная полировка кузова',
        price: 5000,
        duration: 240,
        category: 'detailing',
      },
      {
        name: 'Нанесение воска',
        description: 'Защитное покрытие воском',
        price: 1200,
        duration: 60,
        category: 'maintenance',
      },
      {
        name: 'Мойка двигателя',
        description: 'Безопасная мойка моторного отсека',
        price: 800,
        duration: 45,
        category: 'maintenance',
      },
      {
        name: 'Чернение шин',
        description: 'Обработка шин специальным составом',
        price: 300,
        duration: 15,
        category: 'maintenance',
      },
    ];

    const createdServices = await Service.insertMany(services);
    logger.info(`✅ ${createdServices.length} services created`);

    logger.info('🎉 Database seeding completed successfully!');
    logger.info('');
    logger.info('📋 Credentials:');
    logger.info('   Admin login: admin');
    logger.info('   Admin password: admin123');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
