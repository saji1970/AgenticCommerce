import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import routes from './routes';
import v1Routes from './routes/v1.routes';
import adminRoutes from './routes/admin.routes';
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

  // Routes (legacy)
  app.use('/api', routes);

  // V1 API routes (full mandate server)
  app.use('/api/v1', v1Routes);

  // Admin API routes
  app.use('/api/v1/admin', adminRoutes);

  // Admin UI - serve HTML at root
  app.get('/', (req, res) => {
    res.type('html').send(getAdminHtml(config.backendApiUrl, config.adminToken));
  });

  // Error handling
  app.use(errorHandler);

  return app;
};
