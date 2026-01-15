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

  // Serve admin portal static files
  app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
};
