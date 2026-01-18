import Location, { ILocation } from '@models/Location.model';
import { NotFoundError } from '@shared/errors';
import logger from '@config/logger';

export class LocationService {
  async getAll(activeOnly: boolean = false) {
    const filter = activeOnly ? { isActive: true } : {};
    return Location.find(filter).sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const location = await Location.findById(id);
    if (!location) {
      throw new NotFoundError('Локация');
    }
    return location;
  }

  async create(data: Partial<ILocation>) {
    const location = new Location(data);
    await location.save();
    logger.info(`Location created: ${location._id}`);
    return location;
  }

  async update(id: string, data: Partial<ILocation>) {
    const location = await Location.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!location) {
      throw new NotFoundError('Локация');
    }
    logger.info(`Location updated: ${id}`);
    return location;
  }

  async delete(id: string) {
    const location = await Location.findByIdAndDelete(id);
    if (!location) {
      throw new NotFoundError('Локация');
    }
    logger.info(`Location deleted: ${id}`);
  }
}

export const locationService = new LocationService();

