import { Response } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import Booking from '@models/Booking.model';
import User from '@models/User.model';
import Location from '@models/Location.model';
import Admin from '@models/Admin.model';
import Service from '@models/Service.model';
import Box from '@models/Box.model';
import logger from '@config/logger';
import { forwardGeocode } from '@services/geocoding.service';

/**
 * Получить ID локаций текущего админа (для скоупинга данных)
 */
async function getAdminLocationIds(adminId: string): Promise<string[]> {
  const locationIds = await Location.find({ adminId }).distinct('_id');
  return locationIds.map((id) => id.toString());
}

/**
 * Получение статистики для админ-панели
 */
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.admin?.role === 'super_admin';
    const bookingFilter: Record<string, unknown> = {};

    // Regular admins see only stats for their locations
    if (!isSuperAdmin && req.admin?.id) {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      bookingFilter.locationId = { $in: adminLocationIds };
    }

    // For regular admins, count only customers who booked at their locations
    const customerCountPromise = !isSuperAdmin && bookingFilter.locationId
      ? Booking.distinct('userId', bookingFilter).then((ids) => ids.length)
      : User.countDocuments();

    const [
      totalCustomers,
      totalBookings,
      completedBookings,
      pendingBookings,
      todayBookings,
    ] = await Promise.all([
      customerCountPromise,
      Booking.countDocuments(bookingFilter),
      Booking.countDocuments({ ...bookingFilter, status: 'completed' }),
      Booking.countDocuments({ ...bookingFilter, status: 'pending', prepaymentStatus: 'paid' }),
      Booking.countDocuments({
        ...bookingFilter,
        bookingDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    // Общий доход
    const revenueData = await Booking.aggregate([
      { $match: { ...bookingFilter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Последние бронирования
    const recentBookings = await Booking.find(bookingFilter)
      .populate('userId', 'name phone')
      .populate('locationId', 'name')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Популярные услуги
    const topServices = await Booking.aggregate([
      { $match: { ...bookingFilter, status: { $ne: 'cancelled' } } },
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

    // Regular admins see only bookings for their locations
    if (req.admin?.role !== 'super_admin' && req.admin?.id) {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      filter.locationId = filter.locationId
        ? filter.locationId
        : { $in: adminLocationIds };
    }

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
    if (req.admin?.role !== 'super_admin' && req.admin?.id) {
      // Regular admin: only customers who have bookings at their locations
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      const customerIds = await Booking.distinct('userId', { locationId: { $in: adminLocationIds } });
      const customers = await User.find({ _id: { $in: customerIds } }).sort({ createdAt: -1 });
      res.json(customers);
      return;
    }

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

    const bookingFilter: Record<string, unknown> = { userId: id };

    // Regular admin: only show bookings at their locations, and verify customer access
    if (req.admin?.role !== 'super_admin' && req.admin?.id) {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      bookingFilter.locationId = { $in: adminLocationIds };

      // Check that this customer has at least one booking at admin's locations
      const hasAccess = await Booking.exists({ userId: id, locationId: { $in: adminLocationIds } });
      if (!hasAccess) {
        res.status(403).json({ error: 'Нет доступа к этому клиенту' });
        return;
      }
    }

    const bookings = await Booking.find(bookingFilter)
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

function hasValidCoordinates(payload: Record<string, unknown>): boolean {
  const coords = payload.coordinates as { latitude?: unknown; longitude?: unknown } | undefined;
  return typeof coords?.latitude === 'number' && typeof coords?.longitude === 'number';
}

async function enrichLocationCoordinates(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const hasCoordinates =
    typeof (payload.coordinates as { latitude?: unknown; longitude?: unknown } | undefined)?.latitude === 'number' &&
    typeof (payload.coordinates as { latitude?: unknown; longitude?: unknown } | undefined)?.longitude === 'number';

  if (hasCoordinates) return payload;

  const address = typeof payload.address === 'string' ? payload.address.trim() : '';
  if (address.length < 3) return payload;

  const geocoded = await forwardGeocode(address);
  if (!geocoded) return payload;

  return {
    ...payload,
    coordinates: {
      latitude: geocoded.lat,
      longitude: geocoded.lng,
    },
  };
}

/**
 * CRUD операции для локаций
 */
export const createLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.admin?.id;
    const adminRole = req.admin?.role;

    // Enforce location limit for regular admins
    if (adminRole !== 'super_admin') {
      const admin = await Admin.findById(adminId).select('maxLocations');
      if (!admin) {
        res.status(401).json({ error: 'Администратор не найден' });
        return;
      }
      const currentCount = await Location.countDocuments({ adminId });
      if (currentCount >= (admin.maxLocations || 1)) {
        res.status(403).json({
          error: `Достигнут лимит локаций (${admin.maxLocations || 1}). Обратитесь к супер-администратору для увеличения лимита.`,
        });
        return;
      }
    }

    const body = await enrichLocationCoordinates(pickLocationBody(req.body as Record<string, unknown>));
    if (!body.name && typeof body.address === 'string' && body.address.trim().length > 0) {
      body.name = body.address.trim();
    }
    if (!hasValidCoordinates(body)) {
      res.status(400).json({
        error: 'Не удалось определить координаты локации. Уточните адрес или выберите точку на карте.',
      });
      return;
    }
    const boxCount = typeof req.body.boxCount === 'number' ? Math.min(Math.max(req.body.boxCount, 1), 20) : 0;

    const location = new Location({ ...body, adminId });
    await location.save();

    // Auto-create boxes if boxCount is specified
    if (boxCount > 0) {
      const boxPromises = [];
      for (let i = 1; i <= boxCount; i++) {
        boxPromises.push(
          new Box({
            locationId: location._id,
            name: `Бокс ${i}`,
            number: i,
          }).save()
        );
      }
      await Promise.all(boxPromises);
      logger.info(`Created ${boxCount} boxes for location ${location._id}`);
    }

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
    const filter: Record<string, unknown> = {};
    if (req.admin?.role !== 'super_admin') {
      filter.adminId = req.admin?.id;
    }
    const locations = await Location.find(filter).sort({ createdAt: -1 });

    // Backfill coordinates for legacy records that only have address.
    const missing = locations
      .filter((location) => {
        const hasCoords =
          typeof location.coordinates?.latitude === 'number' &&
          typeof location.coordinates?.longitude === 'number';
        return !hasCoords && !!location.address?.trim();
      })
      .slice(0, 5);

    await Promise.all(
      missing.map(async (location) => {
        const geocoded = await forwardGeocode(location.address.trim());
        if (!geocoded) return;
        location.coordinates = { latitude: geocoded.lat, longitude: geocoded.lng };
        await location.save();
      })
    );

    res.json(locations);
  } catch (error) {
    logger.error('Error getting locations:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check ownership for regular admins
    if (req.admin?.role !== 'super_admin') {
      const existing = await Location.findById(id);
      if (!existing) {
        res.status(404).json({ error: 'Локация не найдена' });
        return;
      }
      if (existing.adminId?.toString() !== req.admin?.id) {
        res.status(403).json({ error: 'Нет доступа к этой локации' });
        return;
      }
    }

    const body = await enrichLocationCoordinates(pickLocationBody(req.body as Record<string, unknown>));
    if (!hasValidCoordinates(body) && body.address !== undefined) {
      res.status(400).json({
        error: 'Не удалось определить координаты локации. Уточните адрес или выберите точку на карте.',
      });
      return;
    }
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

    // Check ownership for regular admins
    if (req.admin?.role !== 'super_admin') {
      const existing = await Location.findById(id);
      if (!existing) {
        res.status(404).json({ error: 'Локация не найдена' });
        return;
      }
      if (existing.adminId?.toString() !== req.admin?.id) {
        res.status(403).json({ error: 'Нет доступа к этой локации' });
        return;
      }
    }

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
