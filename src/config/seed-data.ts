import Admin from '../models/Admin.model';
import Location from '../models/Location.model';
import Service from '../models/Service.model';
import Box from '../models/Box.model';
import logger from './logger';

export const seedDatabase = async () => {
  try {
    // Check if already seeded
    const existingLocations = await Location.countDocuments();
    if (existingLocations > 0) {
      logger.info('📦 Database already has data, skipping seed');
      return;
    }

    logger.info('🌱 Seeding database with initial data...');

    // Create admin
    let adminDoc = await Admin.findOne({ username: 'admin' });
    if (!adminDoc) {
      adminDoc = new Admin({
        username: 'admin',
        password: 'admin123',
        name: 'Администратор',
        email: 'admin@carwash.ru',
        role: 'super_admin',
        maxLocations: 999,
      });
      await adminDoc.save();
      logger.info('✅ Admin created (username: admin, password: admin123)');
    }

    // Create locations
    const locations = [
      {
        name: 'Автомойка на Ленина',
        address: 'ул. Ленина, 45',
        phone: '+7 (999) 123-45-67',
        workingHours: '9:00 - 21:00',
        description: 'Современная автомойка в центре города',
        isActive: true,
      },
      {
        name: 'Автомойка на Гагарина',
        address: 'пр. Гагарина, 12',
        phone: '+7 (999) 765-43-21',
        workingHours: '8:00 - 22:00',
        description: 'Быстрая мойка и детейлинг',
        isActive: true,
      },
      {
        name: 'Автомойка на Мира',
        address: 'ул. Мира, 78',
        phone: '+7 (999) 111-22-33',
        workingHours: '9:00 - 20:00',
        description: 'Профессиональная мойка и полировка',
        isActive: true,
      },
    ];

    const locationsWithAdmin = locations.map((loc) => ({ ...loc, adminId: adminDoc!._id }));
    const createdLocations = await Location.insertMany(locationsWithAdmin);
    logger.info(`✅ ${locations.length} locations created`);

    // Create boxes for each location
    const boxes = [];
    for (const location of createdLocations) {
      // Each location has 3-4 boxes
      const boxCount = location.name.includes('Ленина') ? 4 : 3;
      for (let i = 1; i <= boxCount; i++) {
        boxes.push({
          locationId: location._id,
          name: `Бокс ${i}`,
          number: i,
          description: `Мойка ${i} на ${location.name}`,
          isActive: true,
        });
      }
    }
    await Box.insertMany(boxes);
    logger.info(`✅ ${boxes.length} boxes created`);

    // Create services
    const services = [
      {
        name: 'Экспресс-мойка',
        description: 'Быстрая мойка кузова снаружи',
        price: 500,
        duration: 30,
        category: 'wash',
        isActive: true,
      },
      {
        name: 'Стандартная мойка',
        description: 'Мойка кузова снаружи и внутри салона',
        price: 1000,
        duration: 60,
        category: 'wash',
        isActive: true,
      },
      {
        name: 'Комплексная мойка',
        description: 'Полная мойка + чернение шин + ароматизация',
        price: 1500,
        duration: 90,
        category: 'wash',
        isActive: true,
      },
      {
        name: 'Химчистка салона',
        description: 'Глубокая химчистка салона автомобиля',
        price: 3000,
        duration: 180,
        category: 'detailing',
        isActive: true,
      },
      {
        name: 'Полировка кузова',
        description: 'Профессиональная полировка кузова',
        price: 5000,
        duration: 240,
        category: 'detailing',
        isActive: true,
      },
      {
        name: 'Нанесение воска',
        description: 'Защитное покрытие воском',
        price: 1200,
        duration: 60,
        category: 'maintenance',
        isActive: true,
      },
      {
        name: 'Мойка двигателя',
        description: 'Безопасная мойка моторного отсека',
        price: 800,
        duration: 45,
        category: 'maintenance',
        isActive: true,
      },
      {
        name: 'Чернение шин',
        description: 'Обработка шин специальным составом',
        price: 300,
        duration: 15,
        category: 'maintenance',
        isActive: true,
      },
    ];

    await Service.insertMany(services);
    logger.info(`✅ ${services.length} services created`);

    logger.info('🎉 Database seeded successfully!');
    logger.info('');
    logger.info('📋 Admin credentials:');
    logger.info('   Login: admin');
    logger.info('   Password: admin123');
    logger.info('');
  } catch (error) {
    logger.error('Error seeding database:', error);
  }
};

