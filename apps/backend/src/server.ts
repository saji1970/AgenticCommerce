import { createApp } from './app';
import { config } from './config/env';
import { pool } from './config/database';

const app = createApp();

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');

    app.listen(config.port, () => {
      console.log(`Server running on ${config.apiUrl}`);
      console.log(`Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
