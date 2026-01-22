import User from '@models/User.model';
import Booking from '@models/Booking.model';
import { NotFoundError } from '@shared/errors';

interface RatingCalculation {
  completed: number;
  total: number;
  rating: number;
}

export class CustomerService {
  async getAll() {
    return User.find().sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const customer = await User.findById(id);

    if (!customer) {
      throw new NotFoundError('Клиент');
    }

    const bookings = await Booking.find({ userId: id })
      .populate('locationId', 'name')
      .populate('serviceId', 'name price')
      .sort({ bookingDate: -1 });

    return { customer, bookings };
  }

  async calculateRating(userId: string): Promise<RatingCalculation> {
    const bookings = await Booking.find({ userId });

    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed').length;

    const rating = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { completed, total, rating };
  }

  async updateRating(userId: string): Promise<number> {
    const { rating } = await this.calculateRating(userId);

    await User.findByIdAndUpdate(userId, { rating });

    return rating;
  }
}

export const customerService = new CustomerService();


