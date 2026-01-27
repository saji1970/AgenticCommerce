import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * CA Configuration Context
 * Manages CA server configuration state including URL, API key, certificate status, and demo mode
 */

// Storage keys
const CA_CONFIG_KEY = 'ca_server_config';
const DEMO_MODE_KEY = 'ca_demo_mode';

export interface CAServerConfig {
  serverUrl: string;
  port: string;
  apiKey: string;
  clientCertificatePath?: string;
  isConfigured: boolean;
  lastConnectionTest?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'unknown';
}

export interface CertificateInfo {
  fingerprint: string;
  issuer: string;
  subject: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  isValid: boolean;
  isTestMode: boolean;
}

interface CAConfigContextType {
  // Configuration
  config: CAServerConfig;
  updateConfig: (config: Partial<CAServerConfig>) => Promise<void>;
  clearConfig: () => Promise<void>;

  // Certificate status
  certificateInfo: CertificateInfo | null;
  setCertificateInfo: (info: CertificateInfo | null) => void;

  // Demo mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => Promise<void>;

  // Loading state
  loading: boolean;

  // Connection test
  testConnection: () => Promise<{ success: boolean; message: string }>;
}

const defaultConfig: CAServerConfig = {
  serverUrl: '',
  port: '443',
  apiKey: '',
  isConfigured: false,
  connectionStatus: 'unknown',
};

const CAConfigContext = createContext<CAConfigContextType | undefined>(undefined);

export const CAConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<CAServerConfig>(defaultConfig);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [demoMode, setDemoModeState] = useState<boolean>(true); // Default to demo mode
  const [loading, setLoading] = useState<boolean>(true);

  // Load configuration from storage on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);

      // Load CA server config
      const storedConfig = await AsyncStorage.getItem(CA_CONFIG_KEY);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      }

      // Load demo mode setting
      const storedDemoMode = await AsyncStorage.getItem(DEMO_MODE_KEY);
      if (storedDemoMode !== null) {
        setDemoModeState(storedDemoMode === 'true');
      }
    } catch (error) {
      console.error('Error loading CA config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<CAServerConfig>) => {
    try {
      const newConfig = {
        ...config,
        ...updates,
        isConfigured: !!(updates.serverUrl || config.serverUrl) && !!(updates.apiKey || config.apiKey),
      };
      setConfig(newConfig);
      await AsyncStorage.setItem(CA_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error saving CA config:', error);
      throw error;
    }
  };

  const clearConfig = async () => {
    try {
      setConfig(defaultConfig);
      setCertificateInfo(null);
      await AsyncStorage.removeItem(CA_CONFIG_KEY);
    } catch (error) {
      console.error('Error clearing CA config:', error);
      throw error;
    }
  };

  const setDemoMode = async (enabled: boolean) => {
    try {
      setDemoModeState(enabled);
      await AsyncStorage.setItem(DEMO_MODE_KEY, enabled.toString());
    } catch (error) {
      console.error('Error saving demo mode setting:', error);
      throw error;
    }
  };

  const testConnection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!config.serverUrl) {
      return { success: false, message: 'No server URL configured' };
    }

    try {
      const url = config.port
        ? `${config.serverUrl}:${config.port}/ca/health`
        : `${config.serverUrl}/ca/health`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        // Timeout after 10 seconds
      });

      if (response.ok) {
        await updateConfig({
          connectionStatus: 'connected',
          lastConnectionTest: new Date().toISOString(),
        });
        return { success: true, message: 'Connected successfully' };
      } else {
        await updateConfig({
          connectionStatus: 'disconnected',
          lastConnectionTest: new Date().toISOString(),
        });
        return { success: false, message: `Server returned status ${response.status}` };
      }
    } catch (error) {
      await updateConfig({
        connectionStatus: 'disconnected',
        lastConnectionTest: new Date().toISOString(),
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Connection failed: ${errorMessage}` };
    }
  }, [config]);

  return (
    <CAConfigContext.Provider
      value={{
        config,
        updateConfig,
        clearConfig,
        certificateInfo,
        setCertificateInfo,
        demoMode,
        setDemoMode,
        loading,
        testConnection,
      }}
    >
      {children}
    </CAConfigContext.Provider>
  );
};

export const useCAConfig = () => {
  const context = useContext(CAConfigContext);
  if (!context) {
    throw new Error('useCAConfig must be used within CAConfigProvider');
  }
  return context;
};
