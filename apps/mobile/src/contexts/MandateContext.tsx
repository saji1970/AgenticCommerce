import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import {
  Mandate,
  MandateType,
  MandateStatus,
  CartMandateConstraints,
  IntentMandateConstraints,
  PaymentMandateConstraints,
} from '@agentic-commerce/shared-types';
import mandateService, { CreateMandateParams } from '../services/mandate.service';
import { AppConfig } from '../config/app.config';
import { AppState } from 'react-native';

interface MandateContextType {
  // State
  mandates: Mandate[];
  activeMandates: {
    cart?: Mandate;
    intent?: Mandate;
    payment?: Mandate;
  };
  loading: boolean;
  error: string | null;

  // Methods
  loadMandates: () => Promise<void>;
  getActiveMandateByType: (type: MandateType) => Mandate | null;
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
  const [activeMandates, setActiveMandates] = useState<{
    cart?: Mandate;
    intent?: Mandate;
    payment?: Mandate;
  }>({});
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
   * Load all mandates and update active mandates cache
   */
  const loadMandates = async () => {
    try {
      setLoading(true);
      setError(null);

      const allMandates = await mandateService.getMyMandates();
      setMandates(allMandates);

      // Cache active mandates by type for quick access
      const active: typeof activeMandates = {};
      allMandates.forEach(mandate => {
        if (mandate.status === MandateStatus.ACTIVE) {
          // Check if mandate is expired
          if (mandate.validUntil) {
            const now = new Date();
            const validUntil = new Date(mandate.validUntil);
            if (now > validUntil) {
              // Mandate is expired, skip it
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

      setActiveMandates(active);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to load mandates';
      setError(errorMessage);
      console.error('Failed to load mandates:', err);
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
   */
  const createMandate = async (params: CreateMandateParams): Promise<Mandate> => {
    try {
      setLoading(true);
      setError(null);

      // If constraints not provided, use defaults from config
      const finalParams = {
        ...params,
        constraints: params.constraints || AppConfig.getDefaultConstraints(params.type),
      };

      const mandate = await mandateService.createMandate(finalParams);

      // Auto-approve the mandate
      const approvedMandate = await mandateService.approveMandate(mandate.id);

      // Reload mandates to update cache
      await loadMandates();

      return approvedMandate;
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
    await loadMandates();
    return !!activeMandates[type as keyof typeof activeMandates];
  };

  /**
   * Revoke a mandate
   */
  const revokeMandate = async (mandateId: string, reason: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await mandateService.revokeMandate(mandateId, reason);

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

      await mandateService.approveMandate(mandateId);

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
