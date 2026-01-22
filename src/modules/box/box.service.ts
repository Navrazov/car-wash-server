import Box, { IBox } from '../../models/Box.model';
import Booking from '../../models/Booking.model';
import { AppError } from '../../shared/errors/AppError';

interface CreateBoxDto {
  locationId: string;
  name: string;
  number: number;
  description?: string;
}

interface UpdateBoxDto {
  name?: string;
  number?: number;
  description?: string;
  isActive?: boolean;
}

interface BoxStatus {
  boxId: string;
  name: string;
  number: number;
  isOccupied: boolean;
  currentBooking?: {
    id: string;
    serviceName: string;
    customerName: string;
    startTime: string;
    endTime: string;
  };
  nextBooking?: {
    id: string;
    startTime: string;
  };
}

class BoxService {
  async getAll(locationId?: string): Promise<IBox[]> {
    const filter: any = {};
    if (locationId) {
      filter.locationId = locationId;
    }
    return Box.find(filter).populate('locationId', 'name address').sort({ locationId: 1, number: 1 });
  }

  async getById(id: string): Promise<IBox> {
    const box = await Box.findById(id).populate('locationId', 'name address');
    if (!box) {
      throw new AppError('Box not found', 404);
    }
    return box;
  }

  async create(data: CreateBoxDto): Promise<IBox> {
    // Check for duplicate box number at the same location
    const existing = await Box.findOne({ locationId: data.locationId, number: data.number });
    if (existing) {
      throw new AppError(`Box #${data.number} already exists at this location`, 400);
    }

    const box = new Box(data);
    await box.save();
    return box.populate('locationId', 'name address');
  }

  async update(id: string, data: UpdateBoxDto): Promise<IBox> {
    const box = await Box.findById(id);
    if (!box) {
      throw new AppError('Box not found', 404);
    }

    // Check for duplicate box number if number is being changed
    if (data.number && data.number !== box.number) {
      const existing = await Box.findOne({
        locationId: box.locationId,
        number: data.number,
        _id: { $ne: id },
      });
      if (existing) {
        throw new AppError(`Box #${data.number} already exists at this location`, 400);
      }
    }

    Object.assign(box, data);
    await box.save();
    return box.populate('locationId', 'name address');
  }

  async delete(id: string): Promise<void> {
    const box = await Box.findById(id);
    if (!box) {
      throw new AppError('Box not found', 404);
    }

    // Check if there are any bookings for this box
    const bookingsCount = await Booking.countDocuments({ boxId: id });
    if (bookingsCount > 0) {
      throw new AppError('Cannot delete box with existing bookings', 400);
    }

    await box.deleteOne();
  }

  async getByLocation(locationId: string): Promise<IBox[]> {
    return Box.find({ locationId, isActive: true }).sort({ number: 1 });
  }

  async getBoxesStatus(locationId: string, date?: Date): Promise<BoxStatus[]> {
    const boxes = await Box.find({ locationId, isActive: true }).sort({ number: 1 });
    const now = date || new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get today's date at midnight
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const statuses: BoxStatus[] = [];

    for (const box of boxes) {
      // Get current booking (in_progress or confirmed for current time)
      const currentBooking = await Booking.findOne({
        boxId: box._id,
        bookingDate: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['confirmed', 'in_progress'] },
      })
        .populate('serviceId', 'name duration')
        .populate('userId', 'name phone')
        .sort({ bookingTime: 1 });

      // Get next booking
      const nextBooking = await Booking.findOne({
        boxId: box._id,
        bookingDate: { $gte: todayStart },
        bookingTime: { $gt: currentTime },
        status: { $in: ['pending', 'confirmed'] },
      }).sort({ bookingDate: 1, bookingTime: 1 });

      let isOccupied = false;
      let currentBookingInfo = undefined;

      if (currentBooking) {
        const service = currentBooking.serviceId as any;
        const user = currentBooking.userId as any;
        const bookingTime = currentBooking.bookingTime;
        const [hours, minutes] = bookingTime.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + (service?.duration || 60);
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

        // Check if current time is within booking time
        if (currentTime >= bookingTime && currentTime <= endTime) {
          isOccupied = true;
          currentBookingInfo = {
            id: currentBooking._id.toString(),
            serviceName: service?.name || 'Unknown',
            customerName: user?.name || user?.phone || 'Unknown',
            startTime: bookingTime,
            endTime: endTime,
          };
        }
      }

      statuses.push({
        boxId: box._id.toString(),
        name: box.name,
        number: box.number,
        isOccupied,
        currentBooking: currentBookingInfo,
        nextBooking: nextBooking
          ? {
              id: nextBooking._id.toString(),
              startTime: nextBooking.bookingTime,
            }
          : undefined,
      });
    }

    return statuses;
  }

  async getAvailableBoxes(locationId: string, date: Date, time: string, duration: number): Promise<IBox[]> {
    const boxes = await Box.find({ locationId, isActive: true }).sort({ number: 1 });

    // Get the start and end of the requested day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Calculate requested time range
    const [reqHours, reqMinutes] = time.split(':').map(Number);
    const reqStartMinutes = reqHours * 60 + reqMinutes;
    const reqEndMinutes = reqStartMinutes + duration;

    const availableBoxes: IBox[] = [];

    for (const box of boxes) {
      // Get all bookings for this box on this day
      const bookings = await Booking.find({
        boxId: box._id,
        bookingDate: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ['cancelled'] },
      }).populate('serviceId', 'duration');

      let isAvailable = true;

      for (const booking of bookings) {
        const [bookHours, bookMinutes] = booking.bookingTime.split(':').map(Number);
        const bookStartMinutes = bookHours * 60 + bookMinutes;
        const serviceDuration = (booking.serviceId as any)?.duration || 60;
        const bookEndMinutes = bookStartMinutes + serviceDuration;

        // Check for overlap
        if (reqStartMinutes < bookEndMinutes && reqEndMinutes > bookStartMinutes) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        availableBoxes.push(box);
      }
    }

    return availableBoxes;
  }
}

export const boxService = new BoxService();


