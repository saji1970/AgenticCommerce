import { createApp } from './app';
import { config } from './config/env';
import { pool } from './config/database';
import { runMigrations } from './utils/migrate';

const app = createApp();

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Run migrations
    await runMigrations(pool);

    console.log('🚀 AgenticCommerce Mobile Shopping API v1.0');

    app.listen(config.port, () => {
      console.log(`🌐 Server running on ${config.apiUrl}`);
      console.log(`📦 Environment: ${config.env}`);
      console.log(`✨ Ready to accept requests`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
