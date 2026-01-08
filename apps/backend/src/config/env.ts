import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Parse Railway's DATABASE_URL if available
const parseDatabaseUrl = (url?: string) => {
  if (!url) return null;

  try {
    const dbUrl = new URL(url);
    return {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || '5432', 10),
      name: dbUrl.pathname.slice(1), // Remove leading '/'
      user: dbUrl.username,
      password: dbUrl.password,
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    return null;
  }
};

// Debug: Log DATABASE_URL to help diagnose connection issues
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 DATABASE_URL value:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'NOT SET');

const railwayDb = parseDatabaseUrl(process.env.DATABASE_URL);

if (railwayDb) {
  console.log('✅ Using Railway DATABASE_URL');
  console.log('   Host:', railwayDb.host);
  console.log('   Port:', railwayDb.port);
  console.log('   Database:', railwayDb.name);
} else {
  console.log('⚠️  DATABASE_URL not found, using environment variables or defaults');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  db: railwayDb || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'agentic_commerce',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    // Allow multiple origins for Railway deployment
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:8081'],
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4.5-20250929',
  },

  googleSearch: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || '',
  },

  mcp: {
    configPath: process.env.MCP_CONFIG_PATH || './config/mcp-servers.json',
  },
};
