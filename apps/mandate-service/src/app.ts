import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/env';
import routes from './routes';
import v1Routes from './routes/v1.routes';
import adminRoutes from './routes/admin.routes';
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

  // Routes (legacy)
  app.use('/api', routes);

  // V1 API routes (full mandate server)
  app.use('/api/v1', v1Routes);

  // Admin API routes
  app.use('/api/v1/admin', adminRoutes);

  // Serve admin SPA static files (after API routes so /api takes priority)
  const adminDistPath = path.resolve(__dirname, '../../admin/dist');
  app.use(express.static(adminDistPath));

  // SPA fallback - serve index.html for all non-API routes (client-side routing)
  app.get('*', (req, res, next) => {
    res.sendFile(path.join(adminDistPath, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });

  // Error handling
  app.use(errorHandler);

  return app;
};
