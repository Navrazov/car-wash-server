import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ==================== LOCATIONS ====================

app.get('/api/locations', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY created_at DESC').all();
  res.json(locations);
});

app.get('/api/locations/:id', (req, res) => {
  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!location) return res.status(404).json({ error: 'Локация не найдена' });
  res.json(location);
});

app.post('/api/locations', (req, res) => {
  const { name, address, phone, working_hours } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO locations (id, name, address, phone, working_hours)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, address, phone, working_hours);
  
  res.status(201).json({ id, name, address, phone, working_hours, is_active: 1 });
});

app.put('/api/locations/:id', (req, res) => {
  const { name, address, phone, working_hours, is_active } = req.body;
  
  db.prepare(`
    UPDATE locations SET name = ?, address = ?, phone = ?, working_hours = ?, is_active = ?
    WHERE id = ?
  `).run(name, address, phone, working_hours, is_active ? 1 : 0, req.params.id);
  
  res.json({ id: req.params.id, name, address, phone, working_hours, is_active });
});

app.delete('/api/locations/:id', (req, res) => {
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ==================== SERVICES ====================

app.get('/api/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services ORDER BY created_at DESC').all();
  res.json(services);
});

app.get('/api/services/:id', (req, res) => {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!service) return res.status(404).json({ error: 'Услуга не найдена' });
  res.json(service);
});

app.post('/api/services', (req, res) => {
  const { name, description, price, duration, category } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO services (id, name, description, price, duration, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, description, price, duration, category);
  
  res.status(201).json({ id, name, description, price, duration, category, is_active: 1 });
});

app.put('/api/services/:id', (req, res) => {
  const { name, description, price, duration, category, is_active } = req.body;
  
  db.prepare(`
    UPDATE services SET name = ?, description = ?, price = ?, duration = ?, category = ?, is_active = ?
    WHERE id = ?
  `).run(name, description, price, duration, category, is_active ? 1 : 0, req.params.id);
  
  res.json({ id: req.params.id, name, description, price, duration, category, is_active });
});

app.delete('/api/services/:id', (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ==================== CUSTOMERS ====================

app.get('/api/customers', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  res.json(customers);
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Клиент не найден' });
  res.json(customer);
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email, car_model, car_number } = req.body;
  const id = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO customers (id, name, phone, email, car_model, car_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, phone, email, car_model, car_number);
    
    res.status(201).json({ id, name, phone, email, car_model, car_number, total_visits: 0, total_spent: 0 });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Клиент с таким номером телефона уже существует' });
    } else {
      throw error;
    }
  }
});

app.put('/api/customers/:id', (req, res) => {
  const { name, phone, email, car_model, car_number } = req.body;
  
  db.prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, car_model = ?, car_number = ?
    WHERE id = ?
  `).run(name, phone, email, car_model, car_number, req.params.id);
  
  res.json({ id: req.params.id, name, phone, email, car_model, car_number });
});

app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ==================== BOOKINGS ====================

app.get('/api/bookings', (req, res) => {
  const bookings = db.prepare(`
    SELECT 
      b.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.car_model,
      c.car_number,
      l.name as location_name,
      s.name as service_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN locations l ON b.location_id = l.id
    LEFT JOIN services s ON b.service_id = s.id
    ORDER BY b.booking_date DESC, b.booking_time DESC
  `).all();
  res.json(bookings);
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = db.prepare(`
    SELECT 
      b.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.car_model,
      c.car_number,
      l.name as location_name,
      s.name as service_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN locations l ON b.location_id = l.id
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.id = ?
  `).get(req.params.id);
  
  if (!booking) return res.status(404).json({ error: 'Бронирование не найдено' });
  res.json(booking);
});

app.post('/api/bookings', (req, res) => {
  const { customer_id, location_id, service_id, booking_date, booking_time, total_price, notes } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO bookings (id, customer_id, location_id, service_id, booking_date, booking_time, total_price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, customer_id, location_id, service_id, booking_date, booking_time, total_price, notes);
  
  // Обновляем статистику клиента
  db.prepare(`
    UPDATE customers SET total_visits = total_visits + 1, total_spent = total_spent + ?
    WHERE id = ?
  `).run(total_price, customer_id);
  
  res.status(201).json({ id, customer_id, location_id, service_id, booking_date, booking_time, total_price, notes, status: 'pending' });
});

app.put('/api/bookings/:id', (req, res) => {
  const { status, notes } = req.body;
  
  db.prepare(`
    UPDATE bookings SET status = ?, notes = ?
    WHERE id = ?
  `).run(status, notes, req.params.id);
  
  res.json({ id: req.params.id, status, notes });
});

app.delete('/api/bookings/:id', (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ==================== STATISTICS ====================

app.get('/api/stats', (req, res) => {
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = ?').get('completed').total;
  const pendingBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE status = ?').get('pending').count;
  
  const todayBookings = db.prepare(`
    SELECT COUNT(*) as count FROM bookings 
    WHERE booking_date = date('now')
  `).get().count;
  
  const recentBookings = db.prepare(`
    SELECT 
      b.*,
      c.name as customer_name,
      l.name as location_name,
      s.name as service_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN locations l ON b.location_id = l.id
    LEFT JOIN services s ON b.service_id = s.id
    ORDER BY b.created_at DESC
    LIMIT 5
  `).all();
  
  const topServices = db.prepare(`
    SELECT s.name, COUNT(*) as booking_count
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    GROUP BY s.id
    ORDER BY booking_count DESC
    LIMIT 5
  `).all();
  
  res.json({
    totalCustomers,
    totalBookings,
    totalRevenue,
    pendingBookings,
    todayBookings,
    recentBookings,
    topServices
  });
});

// ==================== AUTH ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const admin = db.prepare('SELECT * FROM admins WHERE username = ? AND password = ?').get(username, password);
  
  if (!admin) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  
  res.json({ id: admin.id, username: admin.username, name: admin.name, role: admin.role });
});

app.listen(PORT, () => {
  console.log(`🚗 Car Wash Server запущен на http://localhost:${PORT}`);
});





