import mongoose from 'mongoose';
import User from '../src/models/User.model';
import Booking from '../src/models/Booking.model';
import { connectDB } from '../src/config/database';
import logger from '../src/config/logger';

async function migrateUserRatings() {
  try {
    await connectDB();

    logger.info('Starting user rating migration...');

    const users = await User.find();
    logger.info(`Found ${users.length} users to process`);

    for (const user of users) {
      const bookings = await Booking.find({ userId: user._id });

      const total = bookings.length;
      const completed = bookings.filter(b => b.status === 'completed').length;

      const rating = total > 0 ? Math.round((completed / total) * 100) : 100;

      await User.findByIdAndUpdate(user._id, { rating });

      logger.info(`Updated user ${user.phone}: ${completed}/${total} bookings = ${rating}% rating`);
    }

    logger.info('User rating migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('User rating migration failed:', error);
    process.exit(1);
  }
}

migrateUserRatings();


