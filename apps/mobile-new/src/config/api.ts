/**
 * API Configuration
 * 
 * Railway Backend URL - Configured to use production Railway deployment
 */
const RAILWAY_API_URL = 'https://agenticcommerce-production.up.railway.app/api/v1';

/**
 * API URL Configuration
 * - Always uses Railway backend URL (https://agenticcommerce-production.up.railway.app)
 */
export const API_URL = RAILWAY_API_URL;

/**
 * Base URL without /api/v1 for services that need it
 * Used by AP2MandateManager and other services
 */
export const API_BASE_URL = RAILWAY_API_URL.replace('/api/v1', '');

