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
    contentSecurityPolicy: false, // Allow inline scripts for admin portal
  }));
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Root endpoint for Railway health checks
  app.get('/', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'AgenticCommerce Backend API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint (before routes)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'AgenticCommerce Backend API',
      timestamp: new Date().toISOString()
    });
  });

  // Serve admin portal static files
  app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
};
