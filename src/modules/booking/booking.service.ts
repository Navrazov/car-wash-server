import Booking from '@models/Booking.model';
import User from '@models/User.model';
import Location from '@models/Location.model';
import Service from '@models/Service.model';
import Employee from '@models/Employee.model';
import paymentService from '@services/payment.service';
import smsService from '@services/sms.service';
import { customerService } from '@modules/customer/customer.service';
import { NotFoundError, ValidationError } from '@shared/errors';
import { BOOKING_STATUSES, TIME_SLOTS, DEFAULT_PREPAYMENT } from '@shared/constants';
import { BookingStatus } from '@shared/types';
import logger from '@config/logger';

interface CreateBookingData {
  userId: string;
  locationId: string;
  boxId?: string;
  serviceId: string;
  employeeId?: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
}

interface BookingFilters {
  status?: string;
  date?: string;
  locationId?: string;
}

export class BookingService {
  async create(data: CreateBookingData) {
    const [location, service] = await Promise.all([
      Location.findById(data.locationId),
      Service.findById(data.serviceId),
    ]);

    if (!location || !location.isActive) {
      throw new NotFoundError('Локация');
    }

    if (!service || !service.isActive) {
      throw new NotFoundError('Услуга');
    }

    // If employeeId is provided, verify employee exists and belongs to location
    if (data.employeeId) {
      const employee = await Employee.findById(data.employeeId);
      if (!employee || !employee.isActive) {
        throw new NotFoundError('Сотрудник');
      }
      if (employee.locationId.toString() !== data.locationId) {
        throw new ValidationError('Сотрудник не принадлежит выбранной локации');
      }
    }

    // Check for existing booking at this time
    // If boxId is provided, check only for that box; otherwise check for any booking at this time/location
    // If employeeId is provided, also check for employee availability
    const existingBookingQuery: any = {
      bookingDate: new Date(data.bookingDate),
      bookingTime: data.bookingTime,
      status: { $nin: ['cancelled'] },
    };
    
    if (data.boxId) {
      existingBookingQuery.boxId = data.boxId;
    } else {
      existingBookingQuery.locationId = data.locationId;
    }

    // If employee is selected, check if they're already booked at this time
    if (data.employeeId) {
      const employeeBookingQuery = {
        ...existingBookingQuery,
        employeeId: data.employeeId,
      };
      const employeeBooking = await Booking.findOne(employeeBookingQuery);
      if (employeeBooking) {
        throw new ValidationError('Сотрудник уже занят в это время');
      }
    }
    
    const existingBooking = await Booking.findOne(existingBookingQuery);

    if (existingBooking) {
      throw new ValidationError('Это время уже забронировано');
    }

    const prepaymentAmount = Number(process.env.BOOKING_PREPAYMENT) || DEFAULT_PREPAYMENT;

    const booking = new Booking({
      userId: data.userId,
      locationId: data.locationId,
      boxId: data.boxId,
      serviceId: data.serviceId,
      employeeId: data.employeeId,
      bookingDate: new Date(data.bookingDate),
      bookingTime: data.bookingTime,
      totalPrice: service.price,
      prepaymentAmount,
      notes: data.notes,
    });

    await booking.save();

    const user = await User.findById(data.userId);
    const paymentResult = await paymentService.initPayment(
      booking._id.toString(),
      prepaymentAmount,
      `Предоплата за бронирование на ${data.bookingDate} в ${data.bookingTime}`,
      user?.phone,
      user?.email
    );

    if (paymentResult.success) {
      booking.paymentId = paymentResult.paymentId;
      booking.paymentUrl = paymentResult.paymentUrl;
      await booking.save();

      logger.info(`Booking created: ${booking._id}`);

      return {
        booking: {
          id: booking._id,
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
          totalPrice: booking.totalPrice,
          prepaymentAmount: booking.prepaymentAmount,
          status: booking.status,
          prepaymentStatus: booking.prepaymentStatus,
        },
        payment: {
          paymentUrl: paymentResult.paymentUrl,
          paymentId: paymentResult.paymentId,
        },
      };
    }

    throw new Error(paymentResult.error || 'Ошибка инициализации платежа');
  }

  async getUserBookings(userId: string) {
    return Booking.find({ userId })
      .populate('locationId', 'name address phone')
      .populate('serviceId', 'name price duration')
      .populate('employeeId', 'name phone position')
      .sort({ bookingDate: -1, bookingTime: -1 });
  }

  async getById(id: string, userId?: string) {
    const filter: Record<string, unknown> = { _id: id };
    if (userId) filter.userId = userId;

    const booking = await Booking.findOne(filter)
      .populate('locationId')
      .populate('serviceId')
      .populate('employeeId', 'name phone position')
      .populate('userId', 'name phone email carModel carNumber');

    if (!booking) {
      throw new NotFoundError('Бронирование');
    }

    return booking;
  }

  async getAll(filters: BookingFilters = {}) {
    const filter: Record<string, unknown> = {};

    if (filters.status) filter.status = filters.status;
    if (filters.date) {
      filter.bookingDate = {
        $gte: new Date(filters.date),
        $lt: new Date(new Date(filters.date).setHours(23, 59, 59, 999)),
      };
    }
    if (filters.locationId) filter.locationId = filters.locationId;

    return Booking.find(filter)
      .populate('userId', 'name phone email carModel carNumber')
      .populate('locationId', 'name address phone')
      .populate('serviceId', 'name price duration')
      .populate('employeeId', 'name phone position')
      .sort({ bookingDate: -1, bookingTime: -1 });
  }

  async updateStatus(id: string, status: string, notes?: string) {
    if (!BOOKING_STATUSES.includes(status as BookingStatus)) {
      throw new ValidationError('Недопустимый статус');
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Бронирование');
    }

    booking.status = status as BookingStatus;
    if (notes) booking.notes = notes;

    if (status === 'completed') {
      booking.completedAt = new Date();
      await User.findByIdAndUpdate(booking.userId, {
        $inc: { totalVisits: 1, totalSpent: booking.totalPrice },
      });
    }

    await booking.save();

    // Update user rating after status change
    await customerService.updateRating(booking.userId.toString());

    logger.info(`Booking ${id} status updated to ${status}`);

    return booking;
  }

  async cancel(id: string, userId: string, reason?: string) {
    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      throw new NotFoundError('Бронирование');
    }

    if (booking.status === 'cancelled') {
      throw new ValidationError('Бронирование уже отменено');
    }

    if (booking.status === 'completed') {
      throw new ValidationError('Невозможно отменить завершенное бронирование');
    }

    if (booking.prepaymentStatus === 'paid' && booking.paymentId) {
      await paymentService.cancelPayment(booking.paymentId, booking.prepaymentAmount);
      booking.prepaymentStatus = 'refunded';
    }

    booking.status = 'cancelled';
    booking.cancelReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    // Update user rating after cancellation
    await customerService.updateRating(booking.userId.toString());

    logger.info(`Booking cancelled: ${booking._id}`);

    return booking;
  }

  async checkPaymentStatus(id: string, userId: string) {
    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      throw new NotFoundError('Бронирование');
    }

    if (!booking.paymentId) {
      throw new ValidationError('Платеж не инициализирован');
    }

    const paymentResult = await paymentService.checkPaymentStatus(booking.paymentId);

    if (paymentResult.success && paymentResult.status === 'CONFIRMED') {
      booking.prepaymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();

      const user = await User.findById(userId);
      if (user?.phone) {
        await smsService.sendBookingNotification(
          user.phone,
          booking.bookingDate.toLocaleDateString('ru-RU'),
          booking.bookingTime
        );
      }

      logger.info(`Payment confirmed for booking ${booking._id}`);
    }

    return {
      status: paymentResult.status,
      prepaymentStatus: booking.prepaymentStatus,
      bookingStatus: booking.status,
    };
  }

  async getAvailableSlots(locationId: string, date: string) {
    const location = await Location.findById(locationId);
    if (!location) {
      throw new NotFoundError('Локация');
    }

    const bookings = await Booking.find({
      locationId,
      bookingDate: new Date(date),
      status: { $nin: ['cancelled'] },
    }).select('bookingTime');

    const bookedTimes = bookings.map((b) => b.bookingTime);
    const availableSlots = TIME_SLOTS.filter((slot) => !bookedTimes.includes(slot));

    return {
      date,
      location: { id: location._id, name: location.name },
      availableSlots,
      bookedSlots: bookedTimes,
    };
  }
}

export const bookingService = new BookingService();


