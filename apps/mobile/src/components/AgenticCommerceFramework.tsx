import React, { useEffect } from 'react';
import { AppConfig } from '../types';
import { setConfig } from '../config';
import App from '../../App';

/**
 * Framework wrapper component for easy integration into existing apps
 * 
 * Usage:
 * ```tsx
 * import { AgenticCommerceFramework } from '@agentic-commerce/mobile';
 * 
 * <AgenticCommerceFramework
 *   config={{
 *     apiBaseUrl: 'https://api.example.com',
 *     enablePriceAlerts: true,
 *     theme: { primaryColor: '#6200EE' }
 *   }}
 * />
 * ```
 */
interface AgenticCommerceFrameworkProps {
  config?: Partial<AppConfig>;
  onError?: (error: Error) => void;
}

export const AgenticCommerceFramework: React.FC<AgenticCommerceFrameworkProps> = ({
  config,
  onError,
}) => {
  useEffect(() => {
    if (config) {
      setConfig(config);
    }
  }, [config]);

  // Error boundary wrapper
  if (onError) {
    // In a real implementation, you'd wrap this with an error boundary
    // that calls onError
  }

  return <App />;
};

export default AgenticCommerceFramework;

