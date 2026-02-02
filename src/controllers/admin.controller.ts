import { Response } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import Booking from '@models/Booking.model';
import User from '@models/User.model';
import Location from '@models/Location.model';
import Service from '@models/Service.model';
import logger from '@config/logger';

/**
 * Получение статистики для админ-панели
 */
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalCustomers,
      totalBookings,
      completedBookings,
      pendingBookings,
      todayBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'pending', prepaymentStatus: 'paid' }),
      Booking.countDocuments({
        bookingDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    // Общий доход
    const revenueData = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Последние бронирования
    const recentBookings = await Booking.find()
      .populate('userId', 'name phone')
      .populate('locationId', 'name')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Популярные услуги
    const topServices = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: '$service' },
      {
        $project: {
          name: '$service.name',
          count: 1,
        },
      },
    ]);

    res.json({
      totalCustomers,
      totalBookings,
      completedBookings,
      pendingBookings,
      todayBookings,
      totalRevenue,
      recentBookings,
      topServices,
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение всех бронирований (для админа)
 */
export const getAllBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, date, locationId } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (date) {
      filter.bookingDate = {
        $gte: new Date(date as string),
        $lt: new Date(new Date(date as string).setHours(23, 59, 59, 999)),
      };
    }
    if (locationId) filter.locationId = locationId;

    const bookings = await Booking.find(filter)
      .populate('userId', 'name phone email carModel carNumber')
      .populate('locationId', 'name address phone')
      .populate('serviceId', 'name price duration')
      .sort({ bookingDate: -1, bookingTime: -1 });

    res.json(bookings);
  } catch (error) {
    logger.error('Error getting all bookings:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Обновление статуса бронирования
 */
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Недопустимый статус' });
      return;
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ error: 'Бронирование не найдено' });
      return;
    }

    booking.status = status;
    if (notes) booking.notes = notes;

    if (status === 'completed') {
      booking.completedAt = new Date();

      // Обновляем статистику пользователя
      await User.findByIdAndUpdate(booking.userId, {
        $inc: {
          totalVisits: 1,
          totalSpent: booking.totalPrice,
        },
      });
    }

    await booking.save();

    logger.info(`Booking ${id} status updated to ${status}`);

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    logger.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение всех клиентов
 */
export const getAllCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customers = await User.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    logger.error('Error getting customers:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение информации о клиенте
 */
export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await User.findById(id);

    if (!customer) {
      res.status(404).json({ error: 'Клиент не найден' });
      return;
    }

    // Получаем историю бронирований клиента
    const bookings = await Booking.find({ userId: id })
      .populate('locationId', 'name')
      .populate('serviceId', 'name price')
      .sort({ bookingDate: -1 });

    res.json({
      customer,
      bookings,
    });
  } catch (error) {
    logger.error('Error getting customer:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/** Допустимые поля для локации (совпадают со схемой) */
const LOCATION_FIELDS = [
  'name',
  'address',
  'phone',
  'workingHours',
  'description',
  'coordinates',
  'rating',
  'totalReviews',
  'isActive',
] as const;

function pickLocationBody(body: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of LOCATION_FIELDS) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
}

/**
 * CRUD операции для локаций
 */
export const createLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = pickLocationBody(req.body as Record<string, unknown>);
    const location = new Location(body);
    await location.save();

    logger.info(`Location created: ${location._id}`);

    res.status(201).json(location);
  } catch (error: unknown) {
    logger.error('Error creating location:', error);
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ValidationError') {
      const msg = (error as { message?: string }).message ?? 'Ошибка валидации';
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const getLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.json(locations);
  } catch (error) {
    logger.error('Error getting locations:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = pickLocationBody(req.body as Record<string, unknown>);
    const location = await Location.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!location) {
      res.status(404).json({ error: 'Локация не найдена' });
      return;
    }

    logger.info(`Location updated: ${id}`);

    res.json(location);
  } catch (error: unknown) {
    logger.error('Error updating location:', error);
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ValidationError') {
      const msg = (error as { message?: string }).message ?? 'Ошибка валидации';
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const deleteLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const location = await Location.findByIdAndDelete(id);

    if (!location) {
      res.status(404).json({ error: 'Локация не найдена' });
      return;
    }

    logger.info(`Location deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting location:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * CRUD операции для услуг
 */
export const createService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = new Service(req.body);
    await service.save();

    logger.info(`Service created: ${service._id}`);

    res.status(201).json(service);
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const getServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    logger.error('Error getting services:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const updateService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!service) {
      res.status(404).json({ error: 'Услуга не найдена' });
      return;
    }

    logger.info(`Service updated: ${id}`);

    res.json(service);
  } catch (error) {
    logger.error('Error updating service:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const deleteService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      res.status(404).json({ error: 'Услуга не найдена' });
      return;
    }

    logger.info(`Service deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
