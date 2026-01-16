import { Pool } from 'pg';
import { config } from './env';

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.url.includes('railway') || config.database.url.includes('localhost') === false
    ? { rejectUnauthorized: false }
    : false,
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};
