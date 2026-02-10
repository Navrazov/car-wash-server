import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { AuthRequest } from '@middlewares/auth.middleware';
import Location from '@models/Location.model';

export const getEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, activeOnly } = req.query;

    // Super admin sees all, regular admin only their locations
    if (req.admin && req.admin.role !== 'super_admin') {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');

      if (locationId) {
        // Validate that requested locationId belongs to this admin
        const isOwned = adminLocationIds.some((id: any) => id.toString() === locationId);
        if (!isOwned) {
          res.status(403).json({ error: 'Нет доступа к этой локации' });
          return;
        }
        const employees = await employeeService.getAll(locationId as string, activeOnly === 'true');
        res.json(employees);
        return;
      }

      // No specific locationId — return employees for all admin's locations
      const employees = await employeeService.getByLocationIds(
        adminLocationIds.map((id: any) => id.toString()),
        activeOnly === 'true'
      );
      res.json(employees);
      return;
    }

    const employees = await employeeService.getAll(locationId as string, activeOnly === 'true');
    res.json(employees);
  } catch (error) {
    next(error);
  }
};

export const getPublicEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.query;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    const employees = await employeeService.getByLocation(locationId as string, true);
    res.json(employees);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await employeeService.getById(req.params.id);
    res.json(employee);
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.admin && req.admin.role !== 'super_admin') {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      const locationIdStr = req.body.locationId;

      // Ensure locationId belongs to admin
      if (locationIdStr) {
        const isOwned = adminLocationIds.some((id: any) => id.toString() === locationIdStr);
        if (!isOwned) {
          res.status(403).json({ error: 'Нет доступа к этой локации' });
          return;
        }
      } else if (adminLocationIds.length === 1) {
        req.body.locationId = adminLocationIds[0].toString();
      }
    }

    const employee = await employeeService.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.admin && req.admin.role !== 'super_admin') {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      const employee = await employeeService.getById(req.params.id);
      const empLocationId = String((employee.locationId as any)?._id ?? employee.locationId);

      const isOwned = adminLocationIds.some((id: any) => id.toString() === empLocationId);
      if (!isOwned) {
        res.status(403).json({ error: 'Нет доступа к этому сотруднику' });
        return;
      }

      // Don't allow moving to a location the admin doesn't own
      if (req.body.locationId) {
        const targetOwned = adminLocationIds.some((id: any) => id.toString() === req.body.locationId);
        if (!targetOwned) {
          res.status(403).json({ error: 'Нельзя перевести сотрудника в чужую локацию' });
          return;
        }
      }
    }

    const employee = await employeeService.update(req.params.id, req.body);
    res.json(employee);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.admin && req.admin.role !== 'super_admin') {
      const adminLocationIds = await Location.find({ adminId: req.admin.id }).distinct('_id');
      const employee = await employeeService.getById(req.params.id);
      const empLocationId = String((employee.locationId as any)?._id ?? employee.locationId);

      const isOwned = adminLocationIds.some((id: any) => id.toString() === empLocationId);
      if (!isOwned) {
        res.status(403).json({ error: 'Нет доступа к этому сотруднику' });
        return;
      }
    }

    await employeeService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

