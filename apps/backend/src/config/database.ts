import { Pool } from 'pg';
import { config } from './env';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s for Railway (was 2s)
  ssl: config.db.host?.includes('railway') || config.db.host?.includes('.up.railway.app') 
    ? { rejectUnauthorized: false } 
    : false,
});

pool.on('error', (err) => {
  console.error('⚠️  Unexpected error on idle database client:', err);
  // Don't exit the process - let the server handle reconnection
  // process.exit(-1); // Removed - this was causing Railway to crash
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = () => {
  return pool.connect();
};
