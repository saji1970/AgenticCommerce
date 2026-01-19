import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';

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
    service: 'Mock Payment Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Mock Payment Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      processPayment: 'POST /process',
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

    console.log(`✅ Payment approved: ${transactionId} for $${paymentRequest.amount}`);

    res.status(200).json(paymentResponse);
  } catch (error: any) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process payment',
    });
  }
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const port = parseInt(process.env.PORT || '3002', 10);
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`🚀 Mock Payment Gateway v1.0.0`);
  console.log(`🌐 Server running on ${host}:${port}`);
  console.log(`📦 Environment: ${config.env}`);
  console.log(`✨ Health check: http://${host}:${port}/health`);
  console.log(`✨ Process payment: POST http://${host}:${port}/process`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  setTimeout(() => process.exit(1), 1000);
});
