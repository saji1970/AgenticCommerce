import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentMandate } from '../services/mandate-service.client';
import { mandateServiceClient } from '../services/mandate-service.client';
import { useAuth } from './AuthContext';
import { getDemoMandates, updateDemoMandate, demoMandates, DEMO_USER_ID } from '../services/demo-seed-data';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production mode - uses mandate service API
const DEMO_MODE = false;
const LOCAL_MANDATES_KEY = 'demo_mandates';

interface MandateContextType {
  mandates: AgentMandate[];
  loading: boolean;
  refreshMandates: () => Promise<void>;
  approveMandate: (mandateId: string) => Promise<void>;
  revokeMandate: (mandateId: string, reason?: string) => Promise<void>;
  suspendMandate: (mandateId: string) => Promise<void>;
  addLocalMandate: (mandate: AgentMandate) => Promise<void>;
}

const MandateContext = createContext<MandateContextType | undefined>(undefined);

/**
 * Get local mandates from AsyncStorage (shared with mobile app)
 */
async function getLocalMandates(): Promise<AgentMandate[]> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_MANDATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save local mandates to AsyncStorage
 */
async function saveLocalMandates(mandates: AgentMandate[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_MANDATES_KEY, JSON.stringify(mandates));
}

export const MandateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mandates, setMandates] = useState<AgentMandate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshMandates();
  }, [user]);

  const refreshMandates = async () => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Get mandates from local storage (shared with mobile app)
        const localMandates = await getLocalMandates();
        // Combine with seed data for display
        const seedMandates = getDemoMandates(user?.id || DEMO_USER_ID);
        // Merge: local mandates take precedence
        const mergedMandates = [...localMandates];
        for (const seedMandate of seedMandates) {
          if (!mergedMandates.find(m => m.id === seedMandate.id)) {
            mergedMandates.push(seedMandate);
          }
        }
        setMandates(mergedMandates);
        setLoading(false);
        return;
      }

      if (!user?.id) {
        setMandates([]);
        setLoading(false);
        return;
      }

      const userMandates = await mandateServiceClient.getUserMandates(user.id);
      setMandates(userMandates);
    } catch (error) {
      console.error('Error fetching mandates:', error);
      // Fallback to demo data
      console.log('Using demo seed data as fallback');
      const localMandates = await getLocalMandates();
      const seedMandates = getDemoMandates(user?.id || DEMO_USER_ID);
      const mergedMandates = [...localMandates];
      for (const seedMandate of seedMandates) {
        if (!mergedMandates.find(m => m.id === seedMandate.id)) {
          mergedMandates.push(seedMandate);
        }
      }
      setMandates(mergedMandates);
    } finally {
      setLoading(false);
    }
  };

  const addLocalMandate = async (mandate: AgentMandate) => {
    const localMandates = await getLocalMandates();
    localMandates.push(mandate);
    await saveLocalMandates(localMandates);
    await refreshMandates();
  };

  const approveMandate = async (mandateId: string) => {
    try {
      if (DEMO_MODE) {
        // Update in local storage
        const localMandates = await getLocalMandates();
        const index = localMandates.findIndex(m => m.id === mandateId);
        if (index >= 0) {
          localMandates[index].status = 'active';
          localMandates[index].updatedAt = new Date().toISOString();
          await saveLocalMandates(localMandates);
        } else {
          // Update seed data
          updateDemoMandate(mandateId, { status: 'active' });
        }
        await refreshMandates();
        return;
      }

      if (!user?.id) throw new Error('User not logged in');
      await mandateServiceClient.approveMandate(mandateId, user.id);
      await refreshMandates();
    } catch (error) {
      console.error('Error approving mandate:', error);
      throw error;
    }
  };

  const revokeMandate = async (mandateId: string, reason?: string) => {
    try {
      if (DEMO_MODE) {
        // Update in local storage
        const localMandates = await getLocalMandates();
        const index = localMandates.findIndex(m => m.id === mandateId);
        if (index >= 0) {
          localMandates[index].status = 'revoked';
          localMandates[index].updatedAt = new Date().toISOString();
          await saveLocalMandates(localMandates);
        } else {
          // Update seed data
          updateDemoMandate(mandateId, { status: 'revoked' });
        }
        await refreshMandates();
        return;
      }

      // In production mode, get userId from mandate itself if auth user is not set
      let userId = user?.id;
      if (!userId) {
        // Try to get userId from the mandate being revoked
        try {
          const mandate = await mandateServiceClient.getMandate(mandateId);
          userId = mandate.userId;
        } catch (e) {
          console.error('Could not fetch mandate to get userId:', e);
        }
      }
      if (!userId) throw new Error('User not logged in');

      await mandateServiceClient.revokeMandate(mandateId, userId, reason);
      console.log('[MandateContext] Mandate revoked on server:', mandateId);
      await refreshMandates();
    } catch (error) {
      console.error('Error revoking mandate:', error);
      throw error;
    }
  };

  const suspendMandate = async (mandateId: string) => {
    try {
      if (DEMO_MODE) {
        // Update in local storage
        const localMandates = await getLocalMandates();
        const index = localMandates.findIndex(m => m.id === mandateId);
        if (index >= 0) {
          localMandates[index].status = 'suspended';
          localMandates[index].updatedAt = new Date().toISOString();
          await saveLocalMandates(localMandates);
        } else {
          // Update seed data
          updateDemoMandate(mandateId, { status: 'suspended' });
        }
        await refreshMandates();
        return;
      }

      if (!user?.id) throw new Error('User not logged in');
      await mandateServiceClient.suspendMandate(mandateId, user.id);
      await refreshMandates();
    } catch (error) {
      console.error('Error suspending mandate:', error);
      // Fallback to demo data update
      const updated = updateDemoMandate(mandateId, { status: 'suspended' });
      if (updated) {
        await refreshMandates();
        return;
      }
      throw error;
    }
  };

  return (
    <MandateContext.Provider
      value={{
        mandates,
        loading,
        refreshMandates,
        approveMandate,
        revokeMandate,
        suspendMandate,
        addLocalMandate,
      }}
    >
      {children}
    </MandateContext.Provider>
  );
};

export const useMandates = () => {
  const context = useContext(MandateContext);
  if (!context) {
    throw new Error('useMandates must be used within MandateProvider');
  }
  return context;
};
