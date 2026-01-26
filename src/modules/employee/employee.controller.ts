import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { AuthRequest } from '@middlewares/auth.middleware';
import Admin from '@models/Admin.model';

export const getEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, activeOnly } = req.query;
    
    // Если админ не super_admin, фильтруем по его локации
    let adminLocationId: string | undefined;
    if (req.admin && req.admin.role !== 'super_admin') {
      const admin = await Admin.findById(req.admin.id).select('locationId');
      if (admin?.locationId) {
        adminLocationId = admin.locationId.toString();
      }
    }
    
    // Используем locationId из запроса или локацию админа
    const filterLocationId = (locationId as string) || adminLocationId;
    
    const employees = await employeeService.getAll(
      filterLocationId,
      activeOnly === 'true'
    );
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
    // Если админ не super_admin, проверяем права доступа
    if (req.admin && req.admin.role !== 'super_admin') {
      const admin = await Admin.findById(req.admin.id).select('locationId');
      if (admin?.locationId) {
        // Устанавливаем locationId из админа, если не указан или отличается
        if (!req.body.locationId || req.body.locationId !== admin.locationId.toString()) {
          req.body.locationId = admin.locationId.toString();
        }
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
    // Если админ не super_admin, проверяем права доступа
    if (req.admin && req.admin.role !== 'super_admin') {
      const admin = await Admin.findById(req.admin.id).select('locationId');
      const employee = await employeeService.getById(req.params.id);
      
      if (admin?.locationId && employee.locationId.toString() !== admin.locationId.toString()) {
        return res.status(403).json({ error: 'Нет доступа к этому сотруднику' });
      }
      
      // Запрещаем изменение locationId для обычных админов
      if (req.body.locationId && req.body.locationId !== admin.locationId?.toString()) {
        return res.status(403).json({ error: 'Нельзя изменить локацию сотрудника' });
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
    // Если админ не super_admin, проверяем права доступа
    if (req.admin && req.admin.role !== 'super_admin') {
      const admin = await Admin.findById(req.admin.id).select('locationId');
      const employee = await employeeService.getById(req.params.id);
      
      if (admin?.locationId && employee.locationId.toString() !== admin.locationId.toString()) {
        return res.status(403).json({ error: 'Нет доступа к этому сотруднику' });
      }
    }
    
    await employeeService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

