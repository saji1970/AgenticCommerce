import { Pool } from 'pg';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

// Redis client
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connection established');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Database helper functions
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Set a timeout of 5 seconds, after which we will log a warning
  const timeout = setTimeout(() => {
    logger.warn('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Override release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    originalRelease();
  };

  return client;
};

// Cache helper functions
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

export const cacheSet = async (
  key: string,
  value: any,
  expirationSeconds: number = 3600
): Promise<void> => {
  await redis.setex(key, expirationSeconds, JSON.stringify(value));
};

export const cacheDelete = async (key: string): Promise<void> => {
  await redis.del(key);
};

export const cacheDeletePattern = async (pattern: string): Promise<void> => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
