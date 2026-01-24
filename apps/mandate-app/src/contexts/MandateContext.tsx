import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentMandate } from '../services/mandate-service.client';
import { mandateServiceClient } from '../services/mandate-service.client';
import { useAuth } from './AuthContext';
import { getDemoMandates, updateDemoMandate } from '../services/demo-seed-data';

interface MandateContextType {
  mandates: AgentMandate[];
  loading: boolean;
  refreshMandates: () => Promise<void>;
  approveMandate: (mandateId: string) => Promise<void>;
  revokeMandate: (mandateId: string, reason?: string) => Promise<void>;
  suspendMandate: (mandateId: string) => Promise<void>;
}

const MandateContext = createContext<MandateContextType | undefined>(undefined);

export const MandateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mandates, setMandates] = useState<AgentMandate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      refreshMandates();
    }
  }, [user]);

  const refreshMandates = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const userMandates = await mandateServiceClient.getUserMandates(user.id);
      setMandates(userMandates);
    } catch (error) {
      console.error('Error fetching mandates:', error);
      // Fallback to demo data in development or when API is unavailable
      if (__DEV__) {
        console.log('Using demo seed data as fallback');
        const demoMandates = getDemoMandates(user.id);
        setMandates(demoMandates);
      }
    } finally {
      setLoading(false);
    }
  };

  const approveMandate = async (mandateId: string) => {
    if (!user?.id) throw new Error('User not logged in');
    
    try {
      await mandateServiceClient.approveMandate(mandateId, user.id);
      await refreshMandates();
    } catch (error) {
      console.error('Error approving mandate:', error);
      // Fallback to demo data update in development
      if (__DEV__) {
        const updated = updateDemoMandate(mandateId, { status: 'active' });
        if (updated) {
          await refreshMandates();
          return;
        }
      }
      throw error;
    }
  };

  const revokeMandate = async (mandateId: string, reason?: string) => {
    if (!user?.id) throw new Error('User not logged in');
    
    try {
      await mandateServiceClient.revokeMandate(mandateId, user.id, reason);
      await refreshMandates();
    } catch (error) {
      console.error('Error revoking mandate:', error);
      // Fallback to demo data update in development
      if (__DEV__) {
        const updated = updateDemoMandate(mandateId, { status: 'revoked' });
        if (updated) {
          await refreshMandates();
          return;
        }
      }
      throw error;
    }
  };

  const suspendMandate = async (mandateId: string) => {
    if (!user?.id) throw new Error('User not logged in');
    
    try {
      await mandateServiceClient.suspendMandate(mandateId, user.id);
      await refreshMandates();
    } catch (error) {
      console.error('Error suspending mandate:', error);
      // Fallback to demo data update in development
      if (__DEV__) {
        const updated = updateDemoMandate(mandateId, { status: 'suspended' });
        if (updated) {
          await refreshMandates();
          return;
        }
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
