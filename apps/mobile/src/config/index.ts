import { AppConfig } from '../types';

// Railway backend URL - Update this with your Railway deployment URL
// You can also set it via EXPO_PUBLIC_RAILWAY_API_URL environment variable
const RAILWAY_API_URL = process.env.EXPO_PUBLIC_RAILWAY_API_URL || 
  process.env.EXPO_PUBLIC_API_URL || 
  'https://your-app.railway.app/api/v1'; // Replace with your Railway URL

// Framework Configuration - Can be overridden by host app
export const defaultConfig: AppConfig = {
  apiBaseUrl: RAILWAY_API_URL,
  enablePriceAlerts: true,
  enableInStoreSearch: true,
  defaultCurrency: 'USD',
  supportedStores: ['amazon', 'walmart', 'target', 'bestbuy'],
  theme: {
    primaryColor: '#6200EE',
    secondaryColor: '#03DAC6',
  },
};

// Global config instance - can be set by host app
let appConfig: AppConfig = defaultConfig;
let demoMode: boolean = process.env.EXPO_PUBLIC_DEMO_MODE === 'true' || false;

export const setConfig = (config: Partial<AppConfig>) => {
  appConfig = { ...appConfig, ...config };
};

export const getConfig = (): AppConfig => appConfig;

export const setDemoMode = (enabled: boolean) => {
  demoMode = enabled;
};

export const isDemoMode = (): boolean => demoMode;

// Export for easy access
export const config = {
  get: getConfig,
  set: setConfig,
  setDemoMode,
  isDemoMode,
};

// Auto-enable demo mode only if explicitly requested
// Otherwise, use Railway backend
if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
  setDemoMode(true);
} else if (!RAILWAY_API_URL.includes('your-app.railway.app') && !RAILWAY_API_URL.includes('localhost')) {
  // If Railway URL is configured, use it (not demo mode)
  setDemoMode(false);
}

