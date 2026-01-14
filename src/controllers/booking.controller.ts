import { Response } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import Booking from '@models/Booking.model';
import User from '@models/User.model';
import Location from '@models/Location.model';
import Service from '@models/Service.model';
import paymentService from '@services/payment.service';
import smsService from '@services/sms.service';
import logger from '@config/logger';

/**
 * Создание нового бронирования
 */
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { locationId, serviceId, bookingDate, bookingTime, notes } = req.body;

    if (!locationId || !serviceId || !bookingDate || !bookingTime) {
      res.status(400).json({ error: 'Все поля обязательны' });
      return;
    }

    // Проверяем существование локации и услуги
    const [location, service] = await Promise.all([
      Location.findById(locationId),
      Service.findById(serviceId),
    ]);

    if (!location || !location.isActive) {
      res.status(404).json({ error: 'Локация не найдена' });
      return;
    }

    if (!service || !service.isActive) {
      res.status(404).json({ error: 'Услуга не найдена' });
      return;
    }

    // Проверяем доступность времени
    const existingBooking = await Booking.findOne({
      locationId,
      bookingDate: new Date(bookingDate),
      bookingTime,
      status: { $nin: ['cancelled'] },
    });

    if (existingBooking) {
      res.status(400).json({ error: 'Это время уже забронировано' });
      return;
    }

    const prepaymentAmount = Number(process.env.BOOKING_PREPAYMENT) || 100;

    // Создаем бронирование
    const booking = new Booking({
      userId,
      locationId,
      serviceId,
      bookingDate: new Date(bookingDate),
      bookingTime,
      totalPrice: service.price,
      prepaymentAmount,
      notes,
    });

    await booking.save();

    // Инициируем платеж
    const user = await User.findById(userId);
    const paymentResult = await paymentService.initPayment(
      booking._id.toString(),
      prepaymentAmount,
      `Предоплата за бронирование на ${bookingDate} в ${bookingTime}`,
      user?.phone,
      user?.email
    );

    if (paymentResult.success) {
      booking.paymentId = paymentResult.paymentId;
      booking.paymentUrl = paymentResult.paymentUrl;
      await booking.save();

      logger.info(`Booking created: ${booking._id}`);

      res.status(201).json({
        success: true,
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
      });
    } else {
      res.status(500).json({ error: paymentResult.error || 'Ошибка инициализации платежа' });
    }
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение списка бронирований пользователя
 */
export const getUserBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const bookings = await Booking.find({ userId })
      .populate('locationId', 'name address phone')
      .populate('serviceId', 'name price duration')
      .sort({ bookingDate: -1, bookingTime: -1 });

    res.json(bookings);
  } catch (error) {
    logger.error('Error getting user bookings:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение деталей конкретного бронирования
 */
export const getBookingById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, userId })
      .populate('locationId')
      .populate('serviceId')
      .populate('userId', 'name phone email carModel carNumber');

    if (!booking) {
      res.status(404).json({ error: 'Бронирование не найдено' });
      return;
    }

    res.json(booking);
  } catch (error) {
    logger.error('Error getting booking:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Проверка статуса оплаты
 */
export const checkPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      res.status(404).json({ error: 'Бронирование не найдено' });
      return;
    }

    if (!booking.paymentId) {
      res.status(400).json({ error: 'Платеж не инициализирован' });
      return;
    }

    const paymentResult = await paymentService.checkPaymentStatus(booking.paymentId);

    if (paymentResult.success && paymentResult.status === 'CONFIRMED') {
      booking.prepaymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();

      // Отправляем SMS уведомление
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

    res.json({
      status: paymentResult.status,
      prepaymentStatus: booking.prepaymentStatus,
      bookingStatus: booking.status,
    });
  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Отмена бронирования
 */
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ _id: id, userId });

    if (!booking) {
      res.status(404).json({ error: 'Бронирование не найдено' });
      return;
    }

    if (booking.status === 'cancelled') {
      res.status(400).json({ error: 'Бронирование уже отменено' });
      return;
    }

    if (booking.status === 'completed') {
      res.status(400).json({ error: 'Невозможно отменить завершенное бронирование' });
      return;
    }

    // Возврат предоплаты, если она была оплачена
    if (booking.prepaymentStatus === 'paid' && booking.paymentId) {
      await paymentService.cancelPayment(booking.paymentId, booking.prepaymentAmount);
      booking.prepaymentStatus = 'refunded';
    }

    booking.status = 'cancelled';
    booking.cancelReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    logger.info(`Booking cancelled: ${booking._id}`);

    res.json({
      success: true,
      message: 'Бронирование отменено',
      booking: {
        id: booking._id,
        status: booking.status,
        prepaymentStatus: booking.prepaymentStatus,
      },
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение доступных слотов для бронирования
 */
export const getAvailableSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { locationId, date } = req.query;

    if (!locationId || !date) {
      res.status(400).json({ error: 'locationId и date обязательны' });
      return;
    }

    const location = await Location.findById(locationId);

    if (!location) {
      res.status(404).json({ error: 'Локация не найдена' });
      return;
    }

    // Получаем все бронирования на эту дату
    const bookings = await Booking.find({
      locationId,
      bookingDate: new Date(date as string),
      status: { $nin: ['cancelled'] },
    }).select('bookingTime');

    const bookedTimes = bookings.map((b) => b.bookingTime);

    // Генерируем все возможные слоты (например, с 9:00 до 21:00 каждый час)
    const allSlots: string[] = [];
    for (let hour = 9; hour < 21; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const availableSlots = allSlots.filter((slot) => !bookedTimes.includes(slot));

    res.json({
      date,
      location: {
        id: location._id,
        name: location.name,
      },
      availableSlots,
      bookedSlots: bookedTimes,
    });
  } catch (error) {
    logger.error('Error getting available slots:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
