import { Router } from 'express';
import Location from '@models/Location.model';
import Service from '@models/Service.model';
import Box from '@models/Box.model';
import { boxService } from '../modules/box/box.service';
import { getPublicEmployees } from '../modules/employee';
import { reviewRoutes } from '../modules/review';
import { adminInviteController } from '../modules/admin-invite';
import { getCountries, getCities, searchAddresses, forwardGeocode, reverseGeocode } from '../services/geocoding.service';

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

    // Backfill coordinates for records that only contain address.
    const missing = locations
      .filter((location) => {
        const hasCoords =
          typeof location.coordinates?.latitude === 'number' &&
          typeof location.coordinates?.longitude === 'number';
        return !hasCoords && !!location.address?.trim();
      })
      .slice(0, 5);

    await Promise.all(
      missing.map(async (location) => {
        const geocoded = await forwardGeocode(location.address.trim());
        if (!geocoded) return;
        location.coordinates = { latitude: geocoded.lat, longitude: geocoded.lng };
        await location.save();
      })
    );

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
 * @route   GET /api/public/locations/:locationId/boxes/occupied-slots
 * @desc    Получить список занятых временных слотов
 * @access  Public
 */
router.get('/locations/:locationId/boxes/occupied-slots', async (req, res) => {
  try {
    const { date, duration, boxId } = req.query;
    
    if (!date || !duration) {
      res.status(400).json({ error: 'date and duration are required' });
      return;
    }
    
    const occupiedSlots = await boxService.getOccupiedTimeSlots(
      req.params.locationId,
      new Date(date as string),
      parseInt(duration as string, 10),
      boxId as string | undefined
    );
    res.json(occupiedSlots);
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
 * @route   GET /api/public/geocoding/addresses
 * @desc    Подсказки адресов (структурированный поиск через Nominatim)
 * @access  Public
 */
router.get('/geocoding/addresses', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const countryCode = typeof req.query.countryCode === 'string' ? req.query.countryCode : undefined;
    const list = await searchAddresses(q, city, countryCode);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/geocoding/forward
 * @desc    Геокодирование адреса → координаты (Яндекс Geocoder + кеш)
 * @access  Public
 */
router.get('/geocoding/forward', async (req, res) => {
  try {
    const address = typeof req.query.address === 'string' ? req.query.address : '';
    const result = await forwardGeocode(address);
    if (!result) {
      res.json(null);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @route   GET /api/public/geocoding/reverse
 * @desc    Геокодирование координат → адрес
 * @access  Public
 */
router.get('/geocoding/reverse', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'lat и lng обязательны' });
      return;
    }
    const result = await reverseGeocode(lat, lng);
    if (!result) {
      res.json(null);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Марки и модели автомобилей
 */
router.get('/car-brands', (_req, res) => {
  res.json(CAR_BRANDS);
});

router.get('/car-brands/:brand/models', (req, res) => {
  const brandName = req.params.brand;
  const brand = CAR_BRANDS.find(b => b.name.toLowerCase() === brandName.toLowerCase());
  if (!brand) {
    res.status(404).json({ error: 'Марка не найдена' });
    return;
  }
  res.json(brand.models);
});

/**
 * Reviews
 */
router.use('/reviews', reviewRoutes);

export default router;

// ─── Car Brands Data ──────────────────────────────────────────
const CAR_BRANDS = [
  { name: 'Acura', models: ['MDX', 'RDX', 'TLX', 'ILX', 'NSX', 'Integra', 'ZDX'] },
  { name: 'Alfa Romeo', models: ['Giulia', 'Giulietta', 'Stelvio', '4C', 'MiTo', '147', '156', '159', 'Tonale'] },
  { name: 'Audi', models: ['A1', 'A3', 'A4', 'A4 Allroad', 'A5', 'A6', 'A6 Allroad', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8', 'e-tron', 'e-tron GT', 'Q4 e-tron', 'Q8 e-tron'] },
  { name: 'BAIC', models: ['X35', 'X55', 'U5 Plus', 'X7', 'BJ40', 'BJ80'] },
  { name: 'BMW', models: ['1 Series', '2 Series', '2 Series Gran Coupe', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'M2', 'M3', 'M4', 'M5', 'M8', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX3'] },
  { name: 'Brilliance', models: ['V3', 'V5', 'H230', 'H530', 'V6', 'V7'] },
  { name: 'Cadillac', models: ['CT4', 'CT5', 'Escalade', 'XT4', 'XT5', 'XT6', 'Lyriq', 'CTS', 'SRX'] },
  { name: 'Changan', models: ['CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'CS85', 'CS95', 'Uni-T', 'Uni-K', 'Uni-V', 'Alsvin', 'Eado Plus', 'Lamore'] },
  { name: 'Chery', models: ['Tiggo 4', 'Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 7 Pro Max', 'Tiggo 8', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max', 'Arrizo 6', 'Arrizo 8', 'Omoda C5', 'Omoda 7', 'Jaecoo J7', 'Jaecoo J8', 'Exeed TXL', 'Exeed VX', 'Exeed LX', 'Exeed RX'] },
  { name: 'Chevrolet', models: ['Aveo', 'Cruze', 'Malibu', 'Camaro', 'Corvette', 'Tahoe', 'Traverse', 'Equinox', 'Cobalt', 'Orlando', 'Tracker', 'Trailblazer', 'Blazer', 'Suburban', 'Captiva', 'Spark', 'Lacetti', 'Niva'] },
  { name: 'Chrysler', models: ['300C', 'Pacifica', 'Voyager', 'PT Cruiser', 'Sebring', 'Crossfire'] },
  { name: 'Citroën', models: ['C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 Aircross', 'C5 X', 'Berlingo', 'C-Elysée', 'SpaceTourer', 'Jumpy'] },
  { name: 'Dacia', models: ['Duster', 'Sandero', 'Logan', 'Jogger', 'Spring', 'Dokker', 'Lodgy'] },
  { name: 'Daewoo', models: ['Matiz', 'Nexia', 'Lacetti', 'Gentra', 'Espero', 'Lanos', 'Nubira'] },
  { name: 'Daihatsu', models: ['Terios', 'Sirion', 'Rocky', 'Materia', 'YRV'] },
  { name: 'Dodge', models: ['Challenger', 'Charger', 'Durango', 'RAM 1500', 'Nitro', 'Journey', 'Caliber', 'Avenger'] },
  { name: 'Dongfeng', models: ['580', 'AX7', 'H30 Cross', 'DFM 370', 'S30', 'T5 Evo'] },
  { name: 'DS', models: ['DS 3', 'DS 4', 'DS 7', 'DS 9'] },
  { name: 'Exeed', models: ['TXL', 'VX', 'LX', 'RX'] },
  { name: 'FAW', models: ['Besturn B30', 'Besturn T77', 'Besturn T99', 'Besturn X40', 'Besturn X80'] },
  { name: 'Ferrari', models: ['Roma', 'F8', 'SF90', '296', '812', 'Portofino', 'Purosangue'] },
  { name: 'Fiat', models: ['500', '500X', '500L', 'Punto', 'Tipo', 'Panda', 'Ducato', 'Doblo', 'Bravo', 'Linea', 'Freemont'] },
  { name: 'Ford', models: ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Explorer', 'Mustang', 'Ranger', 'EcoSport', 'Puma', 'Bronco', 'Edge', 'Escape', 'Expedition', 'F-150', 'Maverick', 'Galaxy', 'S-Max', 'Transit', 'Transit Connect', 'C-Max', 'Fusion', 'Tourneo'] },
  { name: 'GAC', models: ['GS3', 'GS4', 'GS5', 'GS8', 'GA4', 'Empow', 'Emkoo'] },
  { name: 'GAZ', models: ['Газель', 'Газель Next', 'Соболь', 'Валдай', 'ГАЗон Next'] },
  { name: 'Geely', models: ['Atlas', 'Atlas Pro', 'Coolray', 'Tugella', 'Monjaro', 'Emgrand', 'Preface', 'Okavango', 'Azkarra', 'Cityray', 'Geometry C'] },
  { name: 'Genesis', models: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'] },
  { name: 'Great Wall', models: ['Hover H3', 'Hover H5', 'Hover H6', 'Wingle', 'Safe', 'Deer', 'Poer'] },
  { name: 'Haval', models: ['Jolion', 'F7', 'F7x', 'H5', 'H6', 'H9', 'Dargo', 'M6', 'H2', 'H3'] },
  { name: 'Honda', models: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'Pilot', 'Fit', 'City', 'Freed', 'Insight', 'Legend', 'Odyssey', 'Stream', 'Crosstour', 'Element', 'Vezel', 'ZR-V', 'e:Ny1'] },
  { name: 'Hummer', models: ['H1', 'H2', 'H3', 'EV'] },
  { name: 'Hyundai', models: ['Solaris', 'Creta', 'Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'i10', 'i20', 'i30', 'i40', 'Accent', 'Palisade', 'Staria', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Venue', 'Bayon', 'Genesis Coupe', 'ix35', 'Veloster', 'Grandeur', 'Nexo'] },
  { name: 'Infiniti', models: ['Q30', 'Q50', 'Q60', 'Q70', 'QX30', 'QX50', 'QX55', 'QX60', 'QX70', 'QX80', 'FX35', 'FX37', 'FX50', 'EX25', 'EX37', 'G25', 'G37'] },
  { name: 'Isuzu', models: ['D-Max', 'MU-X'] },
  { name: 'Jaguar', models: ['XE', 'XF', 'XJ', 'F-Type', 'F-Pace', 'E-Pace', 'I-Pace', 'S-Type', 'X-Type'] },
  { name: 'Jeep', models: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator', 'Commander', 'Patriot', 'Liberty'] },
  { name: 'Kia', models: ['Rio', 'Ceed', 'Sportage', 'Sorento', 'Optima', 'K5', 'K8', 'K9', 'Seltos', 'Soul', 'Picanto', 'Stinger', 'Carnival', 'EV6', 'EV9', 'Niro', 'Cerato', 'Mohave', 'Telluride', 'Proceed', 'XCeed', 'Stonic', 'Venga'] },
  { name: 'LADA', models: ['Vesta', 'Vesta SW', 'Vesta SW Cross', 'Vesta Sport', 'Granta', 'Granta Cross', 'Niva Travel', 'Niva Legend', 'Largus', 'Largus Cross', 'XRAY', 'XRAY Cross', 'Priora', 'Kalina', '2107', '2114', '2110', '4x4'] },
  { name: 'Lamborghini', models: ['Huracán', 'Urus', 'Revuelto', 'Gallardo', 'Aventador'] },
  { name: 'Land Rover', models: ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar', 'Discovery', 'Discovery Sport', 'Defender', 'Freelander'] },
  { name: 'Lexus', models: ['IS', 'ES', 'GS', 'LS', 'NX', 'RX', 'UX', 'GX', 'LX', 'LC', 'RC', 'CT', 'LBX', 'RZ', 'TX'] },
  { name: 'Lifan', models: ['X50', 'X60', 'X70', 'Solano', 'Breez', 'Cebrium', 'Murman', 'Myway'] },
  { name: 'Lincoln', models: ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'MKZ', 'MKC', 'Town Car'] },
  { name: 'Maserati', models: ['Ghibli', 'Levante', 'Quattroporte', 'MC20', 'Grecale', 'GranTurismo'] },
  { name: 'Mazda', models: ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-9', 'CX-90', 'MX-5', 'MX-30', 'RX-8', 'BT-50', 'MPV', 'Premacy'] },
  { name: 'Mercedes-Benz', models: ['A-Class', 'B-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'S-Class', 'GLA', 'GLB', 'GLC', 'GLC Coupe', 'GLE', 'GLE Coupe', 'GLS', 'G-Class', 'AMG GT', 'SL', 'SLC', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'Vito', 'V-Class', 'Sprinter', 'ML', 'GL'] },
  { name: 'MINI', models: ['Cooper', 'Cooper S', 'Clubman', 'Countryman', 'Paceman', 'Convertible', 'John Cooper Works', 'One'] },
  { name: 'Mitsubishi', models: ['Lancer', 'Lancer Evo', 'Outlander', 'ASX', 'Eclipse Cross', 'Pajero', 'Pajero Sport', 'L200', 'Space Star', 'Colt', 'Galant', 'Carisma', 'Grandis', 'i-MiEV'] },
  { name: 'Moskvitch', models: ['3', '3e', '5', '6', '8'] },
  { name: 'Nissan', models: ['Qashqai', 'X-Trail', 'Juke', 'Leaf', 'Patrol', 'Murano', 'Almera', 'Terrano', 'Note', 'Kicks', 'Pathfinder', 'Navara', 'Micra', 'Sentra', 'Tiida', 'Primera', 'Teana', 'Maxima', '350Z', '370Z', 'GT-R', 'Ariya'] },
  { name: 'Omoda', models: ['C5', 'S5', 'S5 GT', 'E5'] },
  { name: 'Opel', models: ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Crossland', 'Grandland', 'Zafira', 'Meriva', 'Vectra', 'Omega', 'Antara', 'Combo', 'Vivaro'] },
  { name: 'Peugeot', models: ['208', '301', '308', '408', '508', '2008', '3008', '4008', '5008', 'Rifter', 'Traveller', 'Partner', 'Expert', '407', '607'] },
  { name: 'Porsche', models: ['911', '718 Boxster', '718 Cayman', 'Cayenne', 'Macan', 'Panamera', 'Taycan'] },
  { name: 'Ravon', models: ['R2', 'R4', 'Gentra', 'Nexia R3'] },
  { name: 'Renault', models: ['Logan', 'Sandero', 'Sandero Stepway', 'Duster', 'Kaptur', 'Arkana', 'Megane', 'Koleos', 'Fluence', 'Scenic', 'Espace', 'Kangoo', 'Master', 'Trafic', 'Clio', 'Talisman', 'Latitude', 'Symbol', 'Austral'] },
  { name: 'Rolls-Royce', models: ['Phantom', 'Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Spectre'] },
  { name: 'Saab', models: ['9-3', '9-5', '9-4X'] },
  { name: 'Seat', models: ['Leon', 'Ibiza', 'Arona', 'Ateca', 'Tarraco', 'Alhambra', 'Toledo', 'Mii'] },
  { name: 'Skoda', models: ['Octavia', 'Rapid', 'Superb', 'Kodiaq', 'Karoq', 'Kamiq', 'Fabia', 'Scala', 'Enyaq', 'Roomster', 'Yeti', 'Citigo'] },
  { name: 'Smart', models: ['ForTwo', 'ForFour', '#1', '#3'] },
  { name: 'SsangYong', models: ['Actyon', 'Actyon Sports', 'Rexton', 'Kyron', 'Tivoli', 'Korando', 'Musso', 'Torres'] },
  { name: 'Subaru', models: ['Forester', 'Outback', 'XV', 'Crosstrek', 'Impreza', 'WRX', 'Legacy', 'BRZ', 'Levorg', 'Ascent', 'Tribeca'] },
  { name: 'Suzuki', models: ['Vitara', 'SX4', 'SX4 S-Cross', 'Jimny', 'Swift', 'Ignis', 'Baleno', 'Grand Vitara', 'Across', 'Swace'] },
  { name: 'Tank', models: ['300', '500'] },
  { name: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'] },
  { name: 'Toyota', models: ['Camry', 'Corolla', 'Corolla Cross', 'RAV4', 'Land Cruiser 300', 'Land Cruiser Prado', 'Highlander', 'C-HR', 'Prius', 'Yaris', 'Yaris Cross', 'Supra', 'Hilux', 'Fortuner', 'Avalon', 'Auris', 'Avensis', 'Verso', 'Crown', 'bZ4X', 'Sequoia', 'Tundra', 'Tacoma', 'Venza', 'Sienna', 'Alphard'] },
  { name: 'UAZ', models: ['Патриот', 'Хантер', 'Пикап', 'Профи', 'Буханка (452)'] },
  { name: 'Volkswagen', models: ['Polo', 'Golf', 'Passat', 'Passat CC', 'Tiguan', 'Touareg', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'Jetta', 'Arteon', 'T-Roc', 'T-Cross', 'Taos', 'Atlas', 'Caddy', 'Multivan', 'Caravelle', 'Transporter', 'Amarok', 'Scirocco', 'Beetle', 'Touran', 'Sharan', 'Up!'] },
  { name: 'Volvo', models: ['S40', 'S60', 'S80', 'S90', 'V40', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C30', 'C40', 'C70', 'EX30', 'EX90'] },
  { name: 'Zeekr', models: ['001', '007', '009', 'X'] },
  { name: 'Другая', models: ['Другая модель'] },
];
