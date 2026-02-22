import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import {
  Mandate,
  MandateType,
  MandateStatus,
  CartMandateConstraints,
  IntentMandateConstraints,
  PaymentMandateConstraints,
} from '@agentic-commerce/shared-types';
import { CreateMandateParams } from '../services/mandate.service';
import { mandateServiceClient } from '../services/mandate-service.client';
import { storageService } from '../services/storage.service';
import { AppConfig } from '../config/app.config';
import { AppState } from 'react-native';

interface ActiveMandates {
  app?: Mandate;
  cart?: Mandate;
  intent?: Mandate;
  payment?: Mandate;
}

interface MandateContextType {
  // State
  mandates: Mandate[];
  activeMandates: ActiveMandates;
  loading: boolean;
  error: string | null;

  // Methods
  loadMandates: () => Promise<ActiveMandates>;
  getActiveMandateByType: (type: MandateType) => Mandate | null;
  getActiveAppMandate: () => Mandate | null;
  checkAppMandateExists: () => Promise<boolean>;
  createMandate: (params: CreateMandateParams) => Promise<Mandate>;
  checkMandateExists: (type: MandateType) => Promise<boolean>;
  revokeMandate: (mandateId: string, reason: string) => Promise<void>;
  approveMandate: (mandateId: string) => Promise<void>;
  clearError: () => void;
}

const MandateContext = createContext<MandateContextType | undefined>(undefined);

interface MandateProviderProps {
  children: ReactNode;
}

export const MandateProvider: React.FC<MandateProviderProps> = ({ children }) => {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [activeMandates, setActiveMandates] = useState<ActiveMandates>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load mandates on mount and when app comes to foreground
  useEffect(() => {
    loadMandates();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadMandates();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Build active mandates cache from a list of mandates
   */
  const buildActiveMandates = (allMandates: Mandate[]): ActiveMandates => {
    const active: ActiveMandates = {};
    allMandates.forEach(mandate => {
      if (mandate.status === MandateStatus.ACTIVE || mandate.status === ('active' as any)) {
        // Check if mandate is expired
        if (mandate.validUntil) {
          const now = new Date();
          const validUntil = new Date(mandate.validUntil);
          if (now > validUntil) {
            return;
          }
        }

        // Store the most recent active mandate for each type
        if (
          !active[mandate.type as keyof typeof active] ||
          new Date(mandate.createdAt) >
            new Date(active[mandate.type as keyof typeof active]!.createdAt)
        ) {
          active[mandate.type as keyof typeof active] = mandate as any;
        }
      }
    });
    return active;
  };

  /**
   * Get current user ID from storage
   */
  const getUserId = async (): Promise<string> => {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }
    return user.id;
  };

  /**
   * Load all mandates and update active mandates cache
   * Returns the active mandates directly for immediate use (avoids React state timing issues)
   */
  const loadMandates = async (): Promise<ActiveMandates> => {
    try {
      setLoading(true);
      setError(null);

      let userId: string;
      try {
        userId = await getUserId();
      } catch (authErr: any) {
        // User not logged in - expected when on login screen or before auth loads
        if (authErr?.message === 'User not logged in') {
          setMandates([]);
          setActiveMandates({});
          return {};
        }
        throw authErr;
      }

      const apiMandates = await mandateServiceClient.getUserMandates(userId);
      // Cast AgentMandate[] to Mandate[] - structurally compatible
      const allMandates = apiMandates as any as Mandate[];

      setMandates(allMandates);

      const active = buildActiveMandates(allMandates);
      setActiveMandates(active);
      return active;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to load mandates';
      setError(errorMessage);
      console.error('Failed to load mandates:', err);
      return {};
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get active mandate by type
   * Returns null if no active mandate exists
   */
  const getActiveMandateByType = (type: MandateType): Mandate | null => {
    return activeMandates[type as keyof typeof activeMandates] || null;
  };

  /**
   * Create a new mandate with default constraints
   * Auto-approves after registration (user consents via MandateSigningModal)
   */
  const createMandate = async (params: CreateMandateParams): Promise<Mandate> => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getUserId();

      // If constraints not provided, use defaults from config
      const finalParams = {
        ...params,
        constraints: params.constraints || AppConfig.getDefaultConstraints(params.type),
      };

      // Register mandate with mandate-service directly
      const apiMandate = await mandateServiceClient.registerMandate({
        userId,
        agentId: finalParams.agentId,
        agentName: finalParams.agentName,
        type: finalParams.type as 'cart' | 'intent' | 'payment' | 'app',
        constraints: finalParams.constraints,
      });

      const mandate = apiMandate as any as Mandate;

      // Auto-approve all mandate types (user already consented via MandateSigningModal)
      const approvedMandate = await mandateServiceClient.approveMandate(mandate.id, userId);
      await loadMandates();
      return approvedMandate as any as Mandate;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to create mandate';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if an active mandate exists for a specific type
   */
  const checkMandateExists = async (type: MandateType): Promise<boolean> => {
    // First check cached active mandates
    if (activeMandates[type as keyof typeof activeMandates]) {
      return true;
    }

    // If not in cache, reload and check again
    const active = await loadMandates();
    return !!active[type as keyof typeof active];
  };

  /**
   * Revoke a mandate
   */
  const revokeMandate = async (mandateId: string, reason: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getUserId();
      await mandateServiceClient.revokeMandate(mandateId, userId, reason);

      // Reload mandates to update cache
      await loadMandates();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to revoke mandate';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve a pending mandate
   */
  const approveMandate = async (mandateId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getUserId();
      await mandateServiceClient.approveMandate(mandateId, userId);

      // Reload mandates to update cache
      await loadMandates();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to approve mandate';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get active app mandate
   */
  const getActiveAppMandate = (): Mandate | null => {
    return activeMandates.app || null;
  };

  /**
   * Check if an active app mandate exists
   */
  const checkAppMandateExists = async (): Promise<boolean> => {
    if (activeMandates.app) {
      return true;
    }
    const active = await loadMandates();
    return !!active.app;
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return (
    <MandateContext.Provider
      value={{
        mandates,
        activeMandates,
        loading,
        error,
        loadMandates,
        getActiveMandateByType,
        getActiveAppMandate,
        checkAppMandateExists,
        createMandate,
        checkMandateExists,
        revokeMandate,
        approveMandate,
        clearError,
      }}
    >
      {children}
    </MandateContext.Provider>
  );
};

/**
 * Hook to access MandateContext
 */
export const useMandate = (): MandateContextType => {
  const context = useContext(MandateContext);
  if (!context) {
    throw new Error('useMandate must be used within a MandateProvider');
  }
  return context;
};
