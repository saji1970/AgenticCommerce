import { Pool } from 'pg';
import { config } from './env';

const backendPool = new Pool({
  connectionString: config.backendDatabaseUrl,
  ssl: config.backendDatabaseUrl.includes('railway') || !config.backendDatabaseUrl.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

export const backendQuery = async (text: string, params?: any[]) => {
  try {
    const res = await backendPool.query(text, params);
    return res;
  } catch (error) {
    console.error('Backend database query error:', error);
    throw error;
  }
};
