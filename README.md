# Car Wash Server

Backend API для сервиса автомойки на TypeScript + MongoDB + Express.

## Особенности

- ✅ TypeScript архитектура
- ✅ MongoDB база данных
- ✅ SMS авторизация пользователей (через SMS.ru)
- ✅ Интеграция платежной системы Тинькофф
- ✅ Предоплата бронирований (100₽)
- ✅ JWT аутентификация
- ✅ Роли (пользователи и администраторы)

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте `.env.example` в `.env` и заполните переменные
2. База данных MongoDB уже настроена в `.env`
3. Для SMS и платежей можно оставить пустыми (будет mock режим)

## Запуск

```bash
# Заполнить базу тестовыми данными
npm run seed

# Запустить в dev режиме
npm run dev

# Собрать production build
npm run build

# Запустить production
npm start
```

Сервер будет доступен на `http://localhost:3001`

## API Endpoints

### Публичные (не требуют авторизации)

**Локации**
- `GET /api/public/locations` - список активных локаций
- `GET /api/public/locations/:id` - получить локацию

**Услуги**
- `GET /api/public/services` - список активных услуг
- `GET /api/public/services/:id` - получить услугу

### Авторизация пользователей

- `POST /api/auth/send-code` - отправить код подтверждения на телефон
- `POST /api/auth/verify-code` - проверить код и получить токен
- `GET /api/auth/profile` - получить профиль (требует токен)
- `PUT /api/auth/profile` - обновить профиль (требует токен)

### Бронирования (требуют токен пользователя)

- `GET /api/bookings/available-slots` - доступные слоты для бронирования
- `POST /api/bookings` - создать бронирование (возвращает ссылку на оплату)
- `GET /api/bookings` - список бронирований пользователя
- `GET /api/bookings/:id` - детали бронирования
- `GET /api/bookings/:id/payment-status` - проверить статус оплаты
- `POST /api/bookings/:id/cancel` - отменить бронирование

### Админ панель (требуют токен администратора)

**Авторизация**
- `POST /api/admin/auth/login` - вход администратора
- `GET /api/admin/auth/profile` - профиль администратора
- `POST /api/admin/auth/create` - создать администратора (только super_admin)

**Статистика**
- `GET /api/admin/stats` - общая статистика

**Бронирования**
- `GET /api/admin/bookings` - все бронирования (с фильтрами)
- `PUT /api/admin/bookings/:id` - обновить статус бронирования

**Клиенты**
- `GET /api/admin/customers` - все клиенты
- `GET /api/admin/customers/:id` - детали клиента с историей

**Локации (CRUD)**
- `GET /api/admin/locations` - все локации
- `POST /api/admin/locations` - создать локацию
- `PUT /api/admin/locations/:id` - обновить локацию
- `DELETE /api/admin/locations/:id` - удалить локацию

**Услуги (CRUD)**
- `GET /api/admin/services` - все услуги
- `POST /api/admin/services` - создать услугу
- `PUT /api/admin/services/:id` - обновить услугу
- `DELETE /api/admin/services/:id` - удалить услугу

## Учетные данные для входа

После запуска `npm run seed`:

**Администратор:**
- Логин: `admin`
- Пароль: `admin123`

**Пользователи:**
- Авторизация через SMS код (в dev режиме код выводится в консоль)

## Структура проекта

```
car-wash-server/
├── src/
│   ├── config/          # Конфигурация (БД, логгер)
│   ├── controllers/     # Контроллеры
│   ├── middlewares/     # Middleware (auth, rate-limit)
│   ├── models/          # MongoDB модели
│   ├── routes/          # API маршруты
│   ├── services/        # Бизнес-логика (SMS, платежи)
│   └── utils/           # Утилиты
├── scripts/             # Скрипты (seed данные)
├── logs/                # Логи
├── index.ts             # Точка входа
├── .env                 # Переменные окружения
└── tsconfig.json        # TypeScript конфигурация
```

## Платежная система

Используется Тинькофф Acquiring API:
- При создании бронирования генерируется ссылка на оплату
- Предоплата: 100₽
- После оплаты статус бронирования меняется на "confirmed"
- При отмене бронирования возврат средств

## SMS уведомления

Используется SMS.ru API:
- Код подтверждения при авторизации (4 цифры)
- Уведомление о подтвержденном бронировании
- В dev режиме (без SMS_API_ID) коды выводятся в консоль

## MongoDB

База данных: `carwash`

**Коллекции:**
- `users` - пользователи
- `admins` - администраторы
- `locations` - локации автомоек
- `services` - услуги
- `bookings` - бронирования


