import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || process.env.MANDATE_SERVICE_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  backendDatabaseUrl: process.env.BACKEND_DATABASE_URL || process.env.DATABASE_URL || '',
  backendApiUrl: process.env.BACKEND_API_URL || '', // Main backend API URL for admin endpoints
  adminToken: process.env.ADMIN_TOKEN || '', // Admin token for backend API access
  paymentGateway: {
    url: process.env.PAYMENT_GATEWAY_URL || 'http://localhost:3002', // Mock payment gateway URL
  },
};
