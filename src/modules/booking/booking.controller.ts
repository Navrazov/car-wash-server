import { Response, NextFunction } from 'express';
import { bookingService } from './booking.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const { locationId, boxId, serviceId, bookingDate, bookingTime, notes } = req.body;

    if (!locationId || !serviceId || !bookingDate || !bookingTime) {
      res.status(400).json({ error: 'Все поля обязательны' });
      return;
    }

    const result = await bookingService.create({
      userId,
      locationId,
      boxId,
      serviceId,
      bookingDate,
      bookingTime,
      notes,
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const bookings = await bookingService.getUserBookings(userId);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const booking = await bookingService.getById(req.params.id, userId);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, date, locationId } = req.query;
    const bookings = await bookingService.getAll({
      status: status as string,
      date: date as string,
      locationId: locationId as string,
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, notes } = req.body;
    const booking = await bookingService.updateStatus(req.params.id, status, notes);
    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const { reason } = req.body;
    const booking = await bookingService.cancel(req.params.id, userId, reason);
    res.json({ success: true, message: 'Бронирование отменено', booking });
  } catch (error) {
    next(error);
  }
};

export const checkPaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }

    const result = await bookingService.checkPaymentStatus(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, date } = req.query;

    if (!locationId || !date) {
      res.status(400).json({ error: 'locationId и date обязательны' });
      return;
    }

    const result = await bookingService.getAvailableSlots(locationId as string, date as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

