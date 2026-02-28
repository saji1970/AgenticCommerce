import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { query } from './config/database';
import vrpRoutes from './routes/vrp.routes';
import adminRoutes from './routes/admin.routes';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Payment Gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Payment Gateway',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      processPayment: 'POST /process',
      vrp: '/api/vrp/*',
      admin: '/api/admin/*',
    },
  });
});

interface PaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod?: string;
  cardDetails?: any;
  paypalDetails?: any;
  metadata?: any;
}

/**
 * Process Payment Endpoint
 * Simple mock gateway that always approves payments
 */
app.post('/process', async (req: Request, res: Response) => {
  try {
    const paymentRequest: PaymentRequest = req.body;

    // Validate required fields
    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount',
      });
    }

    // Simulate processing delay (100-500ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    // Generate mock transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Always approve the payment
    const paymentResponse = {
      success: true,
      transactionId,
      status: 'approved',
      amount: paymentRequest.amount,
      currency: paymentRequest.currency || 'USD',
      processedAt: new Date().toISOString(),
      gateway: 'Mock Payment Gateway',
    };

    console.log(`Payment approved: ${transactionId} for $${paymentRequest.amount}`);

    res.status(200).json(paymentResponse);
  } catch (error: any) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process payment',
    });
  }
});

// VRP routes
app.use('/api/vrp', vrpRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Initialize database tables
async function initDatabase() {
  if (!config.databaseUrl) {
    console.log('No DATABASE_URL set, skipping database initialization');
    return;
  }
  try {
    // Run migration inline (creates tables if they don't exist)
    await query(`
      CREATE TABLE IF NOT EXISTS vrp_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        agent_id VARCHAR(255) NOT NULL,
        agent_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','revoked','expired')),
        payment_method JSONB NOT NULL,
        max_amount_per_payment NUMERIC(12,2) NOT NULL,
        daily_limit NUMERIC(12,2),
        monthly_limit NUMERIC(12,2),
        expiry_date TIMESTAMP WITH TIME ZONE,
        amount_used_today NUMERIC(12,2) DEFAULT 0,
        amount_used_month NUMERIC(12,2) DEFAULT 0,
        transactions_today INT DEFAULT 0,
        last_daily_reset DATE,
        last_monthly_reset DATE,
        consent_token TEXT,
        constraints JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP WITH TIME ZONE,
        revoked_reason TEXT
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS vrp_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        consent_id UUID NOT NULL REFERENCES vrp_consents(id),
        user_id UUID NOT NULL,
        agent_id VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        transaction_id VARCHAR(255),
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    // Create indexes (safe with IF NOT EXISTS)
    await query(`CREATE INDEX IF NOT EXISTS idx_vrp_consents_user_id ON vrp_consents(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_vrp_consents_agent_id ON vrp_consents(agent_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_vrp_consents_status ON vrp_consents(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_vrp_transactions_consent_id ON vrp_transactions(consent_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_vrp_transactions_user_id ON vrp_transactions(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_vrp_transactions_status ON vrp_transactions(status)`);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start server
const port = parseInt(process.env.PORT || '3002', 10);
const host = process.env.HOST || '0.0.0.0';

initDatabase().then(() => {
  const server = app.listen(port, host, () => {
    console.log(`Payment Gateway v2.0.0`);
    console.log(`Server running on ${host}:${port}`);
    console.log(`Environment: ${config.env}`);
    console.log(`Database: ${config.databaseUrl ? 'connected' : 'not configured'}`);
    console.log(`Health check: http://${host}:${port}/health`);
    console.log(`VRP API: http://${host}:${port}/api/vrp`);
    console.log(`Admin API: http://${host}:${port}/api/admin`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  setTimeout(() => process.exit(1), 1000);
});
