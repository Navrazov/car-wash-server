import { Response, NextFunction } from 'express';
import { locationService } from './location.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const getLocations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const locations = await locationService.getAll();
    res.json(locations);
  } catch (error) {
    next(error);
  }
};

export const getPublicLocations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const locations = await locationService.getAll(true);
    res.json(locations);
  } catch (error) {
    next(error);
  }
};

export const getLocationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const location = await locationService.getById(req.params.id);
    res.json(location);
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const location = await locationService.create(req.body);
    res.status(201).json(location);
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const location = await locationService.update(req.params.id, req.body);
    res.json(location);
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await locationService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};


