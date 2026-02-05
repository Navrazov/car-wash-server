import { Response, NextFunction } from 'express';
import { customerService } from './customer.service';
import { AuthRequest } from '@middlewares/auth.middleware';

export const getAllCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await customerService.getAll();
    res.json(customers);
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await customerService.getById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, carModel, carNumber } = req.body;
    const updated = await customerService.update(req.params.id, { name, email, carModel, carNumber });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await customerService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};


