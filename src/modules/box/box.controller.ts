import { Request, Response, NextFunction } from 'express';
import { boxService } from './box.service';

export const boxController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId } = req.query;
      const boxes = await boxService.getAll(locationId as string);
      res.json(boxes);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const box = await boxService.getById(req.params.id);
      res.json(box);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const box = await boxService.create(req.body);
      res.status(201).json(box);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const box = await boxService.update(req.params.id, req.body);
      res.json(box);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await boxService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getByLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const boxes = await boxService.getByLocation(req.params.locationId);
      res.json(boxes);
    } catch (error) {
      next(error);
    }
  },

  async getBoxesStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId } = req.params;
      const { date } = req.query;
      const status = await boxService.getBoxesStatus(
        locationId,
        date ? new Date(date as string) : undefined
      );
      res.json(status);
    } catch (error) {
      next(error);
    }
  },

  async getAvailableBoxes(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId } = req.params;
      const { date, time, duration } = req.query;

      if (!date || !time || !duration) {
        return res.status(400).json({ message: 'date, time, and duration are required' });
      }

      const boxes = await boxService.getAvailableBoxes(
        locationId,
        new Date(date as string),
        time as string,
        parseInt(duration as string, 10)
      );
      res.json(boxes);
    } catch (error) {
      next(error);
    }
  },
};


