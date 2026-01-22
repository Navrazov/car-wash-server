import { v4 as uuidv4 } from 'uuid';
import db from './database.js';

console.log('🌱 Заполняем базу данных тестовыми данными...');

// Очищаем таблицы
db.exec(`
  DELETE FROM bookings;
  DELETE FROM customers;
  DELETE FROM services;
  DELETE FROM locations;
  DELETE FROM admins;
`);

// Создаем админа
const adminId = uuidv4();
db.prepare(`
  INSERT INTO admins (id, username, password, name, role)
  VALUES (?, ?, ?, ?, ?)
`).run(adminId, 'admin', 'admin123', 'Администратор', 'superadmin');

// Создаем локации
const locations = [
  { id: uuidv4(), name: 'АвтоМойка Центр', address: 'ул. Ленина, 45', phone: '+7 (999) 123-45-67', working_hours: '08:00-22:00' },
  { id: uuidv4(), name: 'АвтоМойка Север', address: 'пр. Мира, 128', phone: '+7 (999) 234-56-78', working_hours: '09:00-21:00' },
  { id: uuidv4(), name: 'АвтоМойка Юг', address: 'ул. Южная, 15', phone: '+7 (999) 345-67-89', working_hours: '08:00-20:00' },
];

locations.forEach(loc => {
  db.prepare(`
    INSERT INTO locations (id, name, address, phone, working_hours)
    VALUES (?, ?, ?, ?, ?)
  `).run(loc.id, loc.name, loc.address, loc.phone, loc.working_hours);
});

// Создаем услуги
const services = [
  { id: uuidv4(), name: 'Экспресс-мойка', description: 'Быстрая мойка кузова', price: 500, duration: 15, category: 'Мойка' },
  { id: uuidv4(), name: 'Стандартная мойка', description: 'Мойка кузова + коврики + пылесос', price: 800, duration: 30, category: 'Мойка' },
  { id: uuidv4(), name: 'Комплексная мойка', description: 'Полная мойка + химчистка салона', price: 1500, duration: 60, category: 'Мойка' },
  { id: uuidv4(), name: 'Полировка кузова', description: 'Полировка с защитным покрытием', price: 3000, duration: 120, category: 'Полировка' },
  { id: uuidv4(), name: 'Химчистка салона', description: 'Глубокая чистка салона', price: 2500, duration: 90, category: 'Химчистка' },
  { id: uuidv4(), name: 'Нанокерамика', description: 'Защитное керамическое покрытие', price: 15000, duration: 240, category: 'Защита' },
];

services.forEach(svc => {
  db.prepare(`
    INSERT INTO services (id, name, description, price, duration, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(svc.id, svc.name, svc.description, svc.price, svc.duration, svc.category);
});

// Создаем клиентов
const customers = [
  { id: uuidv4(), name: 'Иван Петров', phone: '+7 (900) 111-22-33', email: 'ivan@mail.ru', car_model: 'BMW X5', car_number: 'А001АА77' },
  { id: uuidv4(), name: 'Анна Сидорова', phone: '+7 (900) 222-33-44', email: 'anna@mail.ru', car_model: 'Mercedes GLE', car_number: 'В002ВВ77' },
  { id: uuidv4(), name: 'Дмитрий Козлов', phone: '+7 (900) 333-44-55', email: 'dmitry@mail.ru', car_model: 'Audi Q7', car_number: 'С003СС77' },
  { id: uuidv4(), name: 'Елена Новикова', phone: '+7 (900) 444-55-66', email: 'elena@mail.ru', car_model: 'Lexus RX', car_number: 'Е004ЕЕ77' },
  { id: uuidv4(), name: 'Сергей Морозов', phone: '+7 (900) 555-66-77', email: 'sergey@mail.ru', car_model: 'Toyota Camry', car_number: 'К005КК77' },
];

customers.forEach(cust => {
  db.prepare(`
    INSERT INTO customers (id, name, phone, email, car_model, car_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cust.id, cust.name, cust.phone, cust.email, cust.car_model, cust.car_number);
});

// Создаем бронирования
const statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const today = new Date();

for (let i = 0; i < 20; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  const bookingDate = date.toISOString().split('T')[0];
  const hour = 9 + Math.floor(Math.random() * 10);
  const bookingTime = `${hour.toString().padStart(2, '0')}:00`;
  
  const customer = customers[Math.floor(Math.random() * customers.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const service = services[Math.floor(Math.random() * services.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  db.prepare(`
    INSERT INTO bookings (id, customer_id, location_id, service_id, booking_date, booking_time, status, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), customer.id, location.id, service.id, bookingDate, bookingTime, status, service.price);
  
  // Обновляем статистику клиента
  if (status === 'completed') {
    db.prepare(`
      UPDATE customers SET total_visits = total_visits + 1, total_spent = total_spent + ?
      WHERE id = ?
    `).run(service.price, customer.id);
  }
}

console.log('✅ База данных заполнена!');
console.log('👤 Логин: admin');
console.log('🔑 Пароль: admin123');



