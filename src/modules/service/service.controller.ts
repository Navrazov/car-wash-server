import { Response, NextFunction } from 'express';
import { serviceService } from './service.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const getServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const services = await serviceService.getAll();
    res.json(services);
  } catch (error) {
    next(error);
  }
};

export const getPublicServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const services = await serviceService.getAll(true, category as string);
    res.json(services);
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const service = await serviceService.getById(req.params.id);
    res.json(service);
  } catch (error) {
    next(error);
  }
};

export const createService = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const service = await serviceService.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const service = await serviceService.update(req.params.id, req.body);
    res.json(service);
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await serviceService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

