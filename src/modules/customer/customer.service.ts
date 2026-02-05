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

  async update(id: string, data: { name?: string; email?: string; carModel?: string; carNumber?: string }) {
    const customer = await User.findById(id);
    if (!customer) {
      throw new NotFoundError('Клиент');
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );

    return updated;
  }

  async delete(id: string) {
    const customer = await User.findById(id);
    if (!customer) {
      throw new NotFoundError('Клиент');
    }

    // Проверяем есть ли активные бронирования
    const activeBookings = await Booking.countDocuments({
      userId: id,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (activeBookings > 0) {
      throw new Error('Нельзя удалить клиента с активными бронированиями');
    }

    await User.findByIdAndDelete(id);
    return { success: true };
  }
}

export const customerService = new CustomerService();


