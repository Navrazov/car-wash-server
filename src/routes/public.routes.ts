import { Router } from 'express';
import Location from '@models/Location.model';
import Service from '@models/Service.model';
import Box from '@models/Box.model';
import { boxService } from '../modules/box/box.service';
import { getPublicEmployees } from '../modules/employee';
import { reviewRoutes } from '../modules/review';
import { adminInviteController } from '../modules/admin-invite';
import { getCountries, getCities } from '../services/geocoding.service';

const router = Router();

/**
 * @route   GET /api/public/invite/:token
 * @desc    Получить данные приглашения (публично)
 * @access  Public
 */
router.get('/invite/:token', adminInviteController.getInviteByToken);

/**
 * @route   POST /api/public/invite/:token/accept
 * @desc    Принять приглашение — создать админа (публично)
 * @access  Public
 */
router.post('/invite/:token/accept', adminInviteController.acceptInvite);

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

/**
 * @route   GET /api/public/employees
 * @desc    Получить список активных сотрудников для локации
 * @access  Public
 */
router.get('/employees', getPublicEmployees);

/**
 * @route   GET /api/public/geocoding/countries
 * @desc    Список стран с фильтрацией на бэке (?q=поиск)
 * @access  Public
 */
router.get('/geocoding/countries', (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const list = getCountries(q);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/geocoding/cities
 * @desc    Подсказки городов (короткое название без округов). Фильтрация на бэке. ?countryCode=ru&q=мос
 * @access  Public
 */
router.get('/geocoding/cities', async (req, res) => {
  try {
    const countryCode = typeof req.query.countryCode === 'string' ? req.query.countryCode : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const list = await getCities(countryCode, q);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Reviews
 */
router.use('/reviews', reviewRoutes);

export default router;
