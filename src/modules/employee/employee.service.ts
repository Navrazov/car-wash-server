import Employee, { IEmployee } from '@models/Employee.model';
import Location from '@models/Location.model';
import { NotFoundError } from '@shared/errors';
import logger from '@config/logger';

export class EmployeeService {
  async getAll(locationId?: string, activeOnly: boolean = false) {
    const filter: Record<string, unknown> = activeOnly ? { isActive: true } : {};
    if (locationId) {
      filter.locationId = locationId;
    }
    return Employee.find(filter)
      .populate('locationId', 'name address')
      .populate('boxId', 'name number')
      .sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const employee = await Employee.findById(id)
      .populate('locationId', 'name address')
      .populate('boxId', 'name number');
    if (!employee) {
      throw new NotFoundError('Сотрудник');
    }
    return employee;
  }

  async getByLocationIds(locationIds: string[], activeOnly: boolean = false) {
    const filter: Record<string, unknown> = { locationId: { $in: locationIds } };
    if (activeOnly) filter.isActive = true;
    return Employee.find(filter)
      .populate('locationId', 'name address')
      .populate('boxId', 'name number')
      .sort({ createdAt: -1 });
  }

  async getByLocation(locationId: string, activeOnly: boolean = true) {
    const filter: Record<string, unknown> = { locationId, isActive: activeOnly };
    return Employee.find(filter)
      .populate('boxId', 'name number')
      .sort({ name: 1 });
  }

  async create(data: Partial<IEmployee>) {
    // Verify location exists
    const location = await Location.findById(data.locationId);
    if (!location) {
      throw new NotFoundError('Локация');
    }

    const employee = new Employee(data);
    await employee.save();
    logger.info(`Employee created: ${employee._id}`);
    return employee;
  }

  async update(id: string, data: Partial<IEmployee>) {
    if (data.locationId) {
      const location = await Location.findById(data.locationId);
      if (!location) {
        throw new NotFoundError('Локация');
      }
    }

    const employee = await Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!employee) {
      throw new NotFoundError('Сотрудник');
    }
    logger.info(`Employee updated: ${id}`);
    return employee;
  }

  async delete(id: string) {
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) {
      throw new NotFoundError('Сотрудник');
    }
    logger.info(`Employee deleted: ${id}`);
  }
}

export const employeeService = new EmployeeService();

