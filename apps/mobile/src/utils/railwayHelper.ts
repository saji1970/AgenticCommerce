import { getConfig } from '../config';
import { api } from '../services/api';

/**
 * Test Railway backend connection
 * @returns Promise<boolean> - true if Railway is reachable
 */
export const testRailwayConnection = async (): Promise<boolean> => {
  try {
    const config = getConfig();
    const response = await api.client.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn('Railway backend not reachable:', error);
    return false;
  }
};

/**
 * Get Railway backend status
 */
export const getRailwayStatus = async (): Promise<{
  connected: boolean;
  url: string;
  error?: string;
}> => {
  const config = getConfig();
  const url = config.apiBaseUrl;
  
  try {
    const isConnected = await testRailwayConnection();
    return {
      connected: isConnected,
      url,
    };
  } catch (error: any) {
    return {
      connected: false,
      url,
      error: error.message || 'Connection failed',
    };
  }
};

