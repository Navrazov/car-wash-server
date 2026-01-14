import { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

export const configureMiddleware = (app: Express): void => {
  // Security
  app.use(helmet());

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:8080'];
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP
    message: 'Слишком много запросов с этого IP, попробуйте позже',
  });
  app.use('/api/', limiter);

  // SMS rate limiting (более строгий)
  const smsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 3, // максимум 3 SMS в минуту
    message: 'Слишком много попыток отправки SMS, попробуйте позже',
  });
  app.use('/api/auth/send-code', smsLimiter);
};
