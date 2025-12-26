/**
 * API Configuration
 * 
 * IMPORTANT: Update RAILWAY_API_URL with your actual Railway deployment URL
 * 
 * To get your Railway URL:
 * 1. Run: railway login (if not logged in)
 * 2. Run: railway domain
 * 3. Or check your Railway dashboard: https://railway.app/dashboard
 * 
 * The URL format is typically: https://your-app-name.up.railway.app
 */

// TODO: Replace with your actual Railway URL
// Example: 'https://agenticcommerce-production.up.railway.app/api/v1'
const RAILWAY_API_URL = 'https://your-app.railway.app/api/v1';

// For local development, use localhost
const LOCAL_API_URL = 'http://localhost:3000/api/v1';

/**
 * API URL Configuration
 * - Development mode (__DEV__ = true): Uses localhost
 * - Production mode (__DEV__ = false): Uses Railway
 * 
 * Note: In production builds, this will always use Railway
 */
export const API_URL = __DEV__ ? LOCAL_API_URL : RAILWAY_API_URL;

/**
 * Base URL without /api/v1 for services that need it
 * Used by AP2MandateManager and other services
 */
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : RAILWAY_API_URL.replace('/api/v1', '');

