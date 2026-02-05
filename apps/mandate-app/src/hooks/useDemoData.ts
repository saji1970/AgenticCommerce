import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_USER_ID, getDemoMandates } from '../services/demo-seed-data';

/**
 * Hook to initialize demo data for testing
 * Use this in development mode to ensure demo data is available
 * Note: Only auto-logs in on initial app start, not after explicit logout
 */
export function useDemoData() {
  const { user, login } = useAuth();
  const hasInitialized = useRef(false);
  const wasLoggedIn = useRef(false);

  useEffect(() => {
    // Track if user was logged in (to detect logout)
    if (user) {
      wasLoggedIn.current = true;
    }
  }, [user]);

  useEffect(() => {
    // Only auto-login on initial app start, not after explicit logout
    if (__DEV__ && !user && !hasInitialized.current && !wasLoggedIn.current) {
      hasInitialized.current = true;
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
