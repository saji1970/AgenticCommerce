import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { securePayloadMiddleware } from './middleware/secure-payload.middleware';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for admin portal
  }));
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Secure payload middleware - decrypts and verifies encrypted payloads
  app.use(securePayloadMiddleware);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AgenticCommerce Backend API v1.1',
      timestamp: new Date().toISOString()
    });
  });

  // Routes
  app.use('/api', routes);

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
