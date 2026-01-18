import { Router } from 'express';
import Location from '@models/Location.model';
import Service from '@models/Service.model';
import Box from '@models/Box.model';
import { boxService } from '../modules/box/box.service';

const router = Router();

/**
 * @route   GET /api/public/locations
 * @desc    Получить список активных локаций
 * @access  Public
 */
router.get('/locations', async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ name: 1 });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/locations/:id
 * @desc    Получить конкретную локацию
 * @access  Public
 */
router.get('/locations/:id', async (req, res) => {
  try {
    const location = await Location.findOne({ _id: req.params.id, isActive: true });
    
    if (!location) {
      res.status(404).json({ error: 'Локация не найдена' });
      return;
    }
    
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/services
 * @desc    Получить список активных услуг
 * @access  Public
 */
router.get('/services', async (req, res) => {
  try {
    const { category } = req.query;
    const filter: any = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    const services = await Service.find(filter).sort({ category: 1, price: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/services/:id
 * @desc    Получить конкретную услугу
 * @access  Public
 */
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, isActive: true });
    
    if (!service) {
      res.status(404).json({ error: 'Услуга не найдена' });
      return;
    }
    
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/locations/:locationId/boxes
 * @desc    Получить список боксов для локации
 * @access  Public
 */
router.get('/locations/:locationId/boxes', async (req, res) => {
  try {
    const boxes = await Box.find({ 
      locationId: req.params.locationId, 
      isActive: true 
    }).sort({ number: 1 });
    res.json(boxes);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/locations/:locationId/boxes/status
 * @desc    Получить статус занятости боксов для локации
 * @access  Public
 */
router.get('/locations/:locationId/boxes/status', async (req, res) => {
  try {
    const { date } = req.query;
    const status = await boxService.getBoxesStatus(
      req.params.locationId,
      date ? new Date(date as string) : undefined
    );
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/locations/:locationId/boxes/available
 * @desc    Получить доступные боксы для определённого времени
 * @access  Public
 */
router.get('/locations/:locationId/boxes/available', async (req, res) => {
  try {
    const { date, time, duration } = req.query;
    
    if (!date || !time || !duration) {
      res.status(400).json({ error: 'date, time, and duration are required' });
      return;
    }
    
    const boxes = await boxService.getAvailableBoxes(
      req.params.locationId,
      new Date(date as string),
      time as string,
      parseInt(duration as string, 10)
    );
    res.json(boxes);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
