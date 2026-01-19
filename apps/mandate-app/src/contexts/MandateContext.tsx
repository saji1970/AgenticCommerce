import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentMandate } from '../services/mandate-service.client';
import { mandateServiceClient } from '../services/mandate-service.client';
import { useAuth } from './AuthContext';

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
