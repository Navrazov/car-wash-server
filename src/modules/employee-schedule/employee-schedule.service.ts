import EmployeeSchedule from '@models/EmployeeSchedule.model';
import Employee from '@models/Employee.model';
import Box from '@models/Box.model';
import Location from '@models/Location.model';
import { NotFoundError, ValidationError } from '@shared/errors';
import logger from '@config/logger';

interface CreateScheduleData {
  employeeId: string;
  boxId: string;
  locationId: string;
  date: Date;
  startTime?: string;
  endTime?: string;
}

export class EmployeeScheduleService {
  async create(data: CreateScheduleData) {
    // Verify employee exists
    const employee = await Employee.findById(data.employeeId);
    if (!employee) {
      throw new NotFoundError('Сотрудник');
    }

    // Verify box exists
    const box = await Box.findById(data.boxId);
    if (!box) {
      throw new NotFoundError('Бокс');
    }

    // Verify location exists
    const location = await Location.findById(data.locationId);
    if (!location) {
      throw new NotFoundError('Локация');
    }

    // Verify box belongs to location
    if (box.locationId.toString() !== data.locationId) {
      throw new ValidationError('Бокс не принадлежит указанной локации');
    }

    // Check for conflicts - бокс уже занят другим сотрудником в этот день
    const dateStart = new Date(data.date)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(data.date)
    dateEnd.setHours(23, 59, 59, 999)
    
    const conflicts = await EmployeeSchedule.find({
      boxId: data.boxId,
      date: { $gte: dateStart, $lt: dateEnd },
      isActive: true,
      employeeId: { $ne: data.employeeId }, // Исключаем текущего сотрудника
    });

    if (conflicts.length > 0) {
      throw new ValidationError('Бокс уже занят другим сотрудником в этот день');
    }

    const schedule = new EmployeeSchedule({
      employeeId: data.employeeId,
      boxId: data.boxId,
      locationId: data.locationId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
    });

    await schedule.save();
    logger.info(`Employee schedule created: ${schedule._id}`);
    return schedule;
  }

  async update(id: string, data: Partial<CreateScheduleData>) {
    const schedule = await EmployeeSchedule.findById(id);
    if (!schedule) {
      throw new NotFoundError('Расписание');
    }

    if (data.boxId) {
      const box = await Box.findById(data.boxId);
      if (!box) {
        throw new NotFoundError('Бокс');
      }
    }

    Object.assign(schedule, data);
    await schedule.save();
    logger.info(`Employee schedule updated: ${id}`);
    return schedule;
  }

  async delete(id: string) {
    const schedule = await EmployeeSchedule.findByIdAndDelete(id);
    if (!schedule) {
      throw new NotFoundError('Расписание');
    }
    logger.info(`Employee schedule deleted: ${id}`);
  }

  async getByEmployee(employeeId: string, startDate?: Date, endDate?: Date) {
    const filter: any = { employeeId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate.setHours(0, 0, 0, 0));
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate.setHours(23, 59, 59, 999));
      }
    }

    return EmployeeSchedule.find(filter)
      .populate('boxId', 'name number')
      .populate('locationId', 'name address')
      .sort({ date: 1, startTime: 1 });
  }

  async getByBox(boxId: string, startDate?: Date, endDate?: Date) {
    const filter: any = { boxId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate.setHours(0, 0, 0, 0));
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate.setHours(23, 59, 59, 999));
      }
    }

    return EmployeeSchedule.find(filter)
      .populate('employeeId', 'name position')
      .populate('locationId', 'name')
      .sort({ date: 1, startTime: 1 });
  }

  async getByLocation(locationId: string, startDate?: Date, endDate?: Date) {
    const filter: any = { locationId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate.setHours(0, 0, 0, 0));
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate.setHours(23, 59, 59, 999));
      }
    }

    return EmployeeSchedule.find(filter)
      .populate('employeeId', 'name position')
      .populate('boxId', 'name number')
      .sort({ date: 1, startTime: 1 });
  }

  async getByDate(date: Date, locationId?: string) {
    // Validate date
    if (!date || isNaN(date.getTime())) {
      return [];
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const filter: any = {
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
      isActive: true,
    };

    if (locationId) {
      filter.locationId = locationId;
    }

    return EmployeeSchedule.find(filter)
      .populate('employeeId', 'name position')
      .populate('boxId', 'name number')
      .populate('locationId', 'name')
      .sort({ startTime: 1 });
  }

  async getEmployeeForBox(boxId: string, date: Date, time?: string): Promise<string | null> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const schedules = await EmployeeSchedule.find({
      boxId,
      date: { $gte: dayStart, $lte: dayEnd },
      isActive: true,
    })
      .populate('employeeId');

    if (schedules.length === 0) {
      return null;
    }

    // If time is provided, find schedule that covers this time
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const timeMinutes = hours * 60 + minutes;

      for (const schedule of schedules) {
        const scheduleStart = schedule.startTime
          ? schedule.startTime.split(':').map(Number)
          : [0, 0];
        const scheduleEnd = schedule.endTime
          ? schedule.endTime.split(':').map(Number)
          : [23, 59];

        const startMinutes = scheduleStart[0] * 60 + scheduleStart[1];
        const endMinutes = scheduleEnd[0] * 60 + scheduleEnd[1];

        if (timeMinutes >= startMinutes && timeMinutes <= endMinutes) {
          return (schedule.employeeId as any)._id.toString();
        }
      }
    }

    // Return first employee if no time specified or no time match
    return (schedules[0].employeeId as any)._id.toString();
  }
}

export const employeeScheduleService = new EmployeeScheduleService();
