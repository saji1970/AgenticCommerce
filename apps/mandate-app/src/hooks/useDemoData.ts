import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_USER_ID, getDemoMandates } from '../services/demo-seed-data';

/**
 * Hook to initialize demo data for testing
 * Use this in development mode to ensure demo data is available
 */
export function useDemoData() {
  const { user, login } = useAuth();

  useEffect(() => {
    if (__DEV__ && !user) {
      // Auto-login with demo user in development
      login(DEMO_USER_ID, 'demo@example.com', 'Demo User');
    }
  }, [user, login]);

  return {
    isDemoMode: __DEV__,
    demoUserId: DEMO_USER_ID,
    hasDemoData: () => {
      const mandates = getDemoMandates(DEMO_USER_ID);
      return mandates.length > 0;
    },
  };
}
