import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for admin UI
  }));
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mandate-service' });
  });

  // Routes
  app.use('/api', routes);

  // Admin UI route (serves HTML from route handler)
  app.use('/', require('./routes/admin.routes').default);

  // Error handling
  app.use(errorHandler);

  return app;
};
