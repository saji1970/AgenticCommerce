import { createApp } from './app';
import { config } from './config/env';
import { pool } from './config/database';
import { runMigrations } from './utils/migrate';

const app = createApp();

const startServer = async () => {
  try {
    // Test database connection with retries for Railway
    let dbConnected = false;
    const maxRetries = 5;
    let retryCount = 0;

    while (!dbConnected && retryCount < maxRetries) {
      try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        dbConnected = true;
      } catch (dbError: any) {
        retryCount++;
        console.error(`⚠️  Database connection attempt ${retryCount}/${maxRetries} failed:`, dbError.message);
        
        if (retryCount < maxRetries) {
          const waitTime = retryCount * 2000; // Exponential backoff: 2s, 4s, 6s, 8s, 10s
          console.log(`⏳ Retrying database connection in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error('❌ Failed to connect to database after all retries');
          throw dbError;
        }
      }
    }

    // Run migrations (non-blocking - continue even if migrations fail)
    try {
      await runMigrations(pool);
      console.log('✅ Migrations completed');
    } catch (migrationError: any) {
      console.error('⚠️  Migration error (continuing anyway):', migrationError.message);
      // Don't exit on migration errors - they might be harmless (e.g., table already exists)
    }

    console.log('🚀 AgenticCommerce Mobile Shopping API v1.0');

    // Railway requires binding to 0.0.0.0 and using PORT env var
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    console.log(`🔧 Starting server on ${host}:${port} (PORT env: ${process.env.PORT || 'not set'})`);
    
    const server = app.listen(port, host, () => {
      const address = server.address();
      console.log(`🌐 Server listening on ${typeof address === 'string' ? address : `${address?.address}:${address?.port}`}`);
      console.log(`📦 Environment: ${config.env}`);
      console.log(`✨ API URL: ${config.apiUrl}`);
      console.log(`✨ Ready to accept requests`);
      console.log(`✨ Health check: http://${host}:${port}/health`);
    });

    // Handle server errors
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        pool.end(() => {
          console.log('Database pool closed');
          process.exit(0);
        });
      });
    });

  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      dbConfig: {
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        hasPassword: !!config.db.password,
      },
    });
    // Don't exit immediately - give Railway a chance to see the error in logs
    process.exit(1);
  }
};

startServer();
