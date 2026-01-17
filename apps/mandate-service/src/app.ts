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

  // Admin UI
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
};
