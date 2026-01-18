import Service, { IService } from '@models/Service.model';
import { NotFoundError } from '@shared/errors';
import logger from '@config/logger';

export class ServiceService {
  async getAll(activeOnly: boolean = false, category?: string) {
    const filter: Record<string, unknown> = activeOnly ? { isActive: true } : {};
    if (category) {
      filter.category = category;
    }
    return Service.find(filter).sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const service = await Service.findById(id);
    if (!service) {
      throw new NotFoundError('Услуга');
    }
    return service;
  }

  async create(data: Partial<IService>) {
    const service = new Service(data);
    await service.save();
    logger.info(`Service created: ${service._id}`);
    return service;
  }

  async update(id: string, data: Partial<IService>) {
    const service = await Service.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!service) {
      throw new NotFoundError('Услуга');
    }
    logger.info(`Service updated: ${id}`);
    return service;
  }

  async delete(id: string) {
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      throw new NotFoundError('Услуга');
    }
    logger.info(`Service deleted: ${id}`);
  }
}

export const serviceService = new ServiceService();

