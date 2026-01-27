import { Request, Response, NextFunction } from 'express';
import { employeeScheduleService } from './employee-schedule.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const employeeScheduleController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, boxId, locationId, date, startTime, endTime } = req.body;

      if (!employeeId || !boxId || !locationId || !date) {
        return res.status(400).json({ error: 'employeeId, boxId, locationId и date обязательны' });
      }

      const schedule = await employeeScheduleService.create({
        employeeId,
        boxId,
        locationId,
        date: new Date(date),
        startTime,
        endTime,
      });

      res.status(201).json(schedule);
    } catch (error: any) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData: any = {};

      if (req.body.date) updateData.date = new Date(req.body.date);
      if (req.body.startTime !== undefined) updateData.startTime = req.body.startTime;
      if (req.body.endTime !== undefined) updateData.endTime = req.body.endTime;
      if (req.body.boxId !== undefined) updateData.boxId = req.body.boxId;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const schedule = await employeeScheduleService.update(id, updateData);
      res.json(schedule);
    } catch (error: any) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await employeeScheduleService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      const schedules = await employeeScheduleService.getByEmployee(
        employeeId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  },

  async getByBox(req: Request, res: Response, next: NextFunction) {
    try {
      const { boxId } = req.params;
      const { startDate, endDate } = req.query;

      const schedules = await employeeScheduleService.getByBox(
        boxId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  },

  async getByLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      const schedules = await employeeScheduleService.getByLocation(
        locationId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  },

  async getByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const { locationId } = req.query;

      if (!date || date === '' || date === '0002-02-28') {
        return res.json([]); // Return empty array for invalid dates
      }

      const schedules = await employeeScheduleService.getByDate(
        new Date(date as string),
        locationId as string | undefined
      );
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  },
};
