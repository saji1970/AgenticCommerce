import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { PurchaseIntent, CreateIntentRequest } from '@agentic-commerce/shared-types';
import mandateService from '../services/mandate.service';
import { AppState } from 'react-native';

interface IntentContextType {
  // State
  intents: PurchaseIntent[];
  pendingIntents: PurchaseIntent[];
  loading: boolean;
  error: string | null;

  // Methods
  createIntent: (request: CreateIntentRequest) => Promise<PurchaseIntent>;
  loadIntents: () => Promise<void>;
  approveIntent: (intentId: string) => Promise<void>;
  rejectIntent: (intentId: string, reason: string) => Promise<void>;
  clearError: () => void;
}

const IntentContext = createContext<IntentContextType | undefined>(undefined);

interface IntentProviderProps {
  children: ReactNode;
}

export const IntentProvider: React.FC<IntentProviderProps> = ({ children }) => {
  const [intents, setIntents] = useState<PurchaseIntent[]>([]);
  const [pendingIntents, setPendingIntents] = useState<PurchaseIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load intents on mount and when app comes to foreground
  useEffect(() => {
    loadIntents();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadIntents();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Load all intents and separate pending ones
   */
  const loadIntents = async () => {
    try {
      setLoading(true);
      setError(null);

      const allIntents = await mandateService.getPurchaseIntents();
      setIntents(allIntents);

      // Filter pending intents
      const pending = allIntents.filter(intent => intent.status === 'pending');
      setPendingIntents(pending);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load intents';
      setError(errorMessage);
      console.error('Failed to load intents:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new purchase intent
   */
  const createIntent = async (request: CreateIntentRequest): Promise<PurchaseIntent> => {
    try {
      setError(null);

      // Use the acpService which properly handles API calls
      const api = await import('../services/api');
      const response = await api.default.post<PurchaseIntent>('/acp/intents', request);

      // Reload intents to get updated list
      await loadIntents();

      return response;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to create intent';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Approve a purchase intent
   */
  const approveIntent = async (intentId: string): Promise<void> => {
    try {
      setError(null);
      await mandateService.approveIntent(intentId);
      await loadIntents();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to approve intent';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Reject a purchase intent
   */
  const rejectIntent = async (intentId: string, reason: string): Promise<void> => {
    try {
      setError(null);
      await mandateService.rejectIntent(intentId, reason);
      await loadIntents();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to reject intent';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  const value: IntentContextType = {
    intents,
    pendingIntents,
    loading,
    error,
    createIntent,
    loadIntents,
    approveIntent,
    rejectIntent,
    clearError,
  };

  return <IntentContext.Provider value={value}>{children}</IntentContext.Provider>;
};

/**
 * Hook to use Intent context
 */
export const useIntent = (): IntentContextType => {
  const context = useContext(IntentContext);
  if (!context) {
    throw new Error('useIntent must be used within an IntentProvider');
  }
  return context;
};
