import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { getAdminHtml } from './utils/admin-ui';

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

  // Admin UI - serve HTML at root
  app.get('/', (req, res) => {
    res.type('html').send(getAdminHtml());
  });

  // Error handling
  app.use(errorHandler);

  return app;
};
