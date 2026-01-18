import User from '@models/User.model';
import Booking from '@models/Booking.model';
import { NotFoundError } from '@shared/errors';

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
}

export const customerService = new CustomerService();

