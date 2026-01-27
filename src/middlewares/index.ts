import { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

export const configureMiddleware = (app: Express): void => {
  // Security (отключаем некоторые helmet опции для dev)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  }));

  // CORS - в dev режиме разрешаем всё
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    app.use(cors({
      origin: true, // Разрешить любой origin в dev
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
  } else {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
    app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
      })
    );
  }

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Rate limiting - более мягкий для dev режима
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: isDev ? 1000 : 100, // В dev режиме больше лимит
    message: 'Слишком много запросов с этого IP, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Применяем rate limiting только к публичным API, не к админским
  app.use('/api/public/', limiter);
  app.use('/api/auth/', limiter);
  app.use('/api/bookings/', limiter);
  
  // Для админских роутов - более мягкий лимит
  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 2000 : 500,
    message: 'Слишком много запросов, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/admin/', adminLimiter);

  // SMS rate limiting (более строгий)
  const smsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 3, // максимум 3 SMS в минуту
    message: 'Слишком много попыток отправки SMS, попробуйте позже',
  });
  app.use('/api/auth/send-code', smsLimiter);
};
