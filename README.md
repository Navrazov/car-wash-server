# Car Wash Server

Backend API для сервиса автомойки.

## Установка

```bash
npm install
```

## Запуск

```bash
# Заполнить базу тестовыми данными
npm run seed

# Запустить сервер
npm run dev
```

Сервер будет доступен на `http://localhost:3001`

## API Endpoints

### Локации
- `GET /api/locations` - список локаций
- `GET /api/locations/:id` - получить локацию
- `POST /api/locations` - создать локацию
- `PUT /api/locations/:id` - обновить локацию
- `DELETE /api/locations/:id` - удалить локацию

### Услуги
- `GET /api/services` - список услуг
- `GET /api/services/:id` - получить услугу
- `POST /api/services` - создать услугу
- `PUT /api/services/:id` - обновить услугу
- `DELETE /api/services/:id` - удалить услугу

### Клиенты
- `GET /api/customers` - список клиентов
- `GET /api/customers/:id` - получить клиента
- `POST /api/customers` - создать клиента
- `PUT /api/customers/:id` - обновить клиента
- `DELETE /api/customers/:id` - удалить клиента

### Бронирования
- `GET /api/bookings` - список бронирований
- `GET /api/bookings/:id` - получить бронирование
- `POST /api/bookings` - создать бронирование
- `PUT /api/bookings/:id` - обновить бронирование
- `DELETE /api/bookings/:id` - удалить бронирование

### Статистика
- `GET /api/stats` - общая статистика

### Авторизация
- `POST /api/auth/login` - вход в систему

## Учетные данные для входа

- Логин: `admin`
- Пароль: `admin123`

