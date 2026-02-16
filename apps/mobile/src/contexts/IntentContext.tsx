import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { PurchaseIntent, CreateIntentRequest } from '@agentic-commerce/shared-types';
import mandateService from '../services/mandate.service';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openMandateAppForIntent, IntentData, clearPendingIntentData } from '../utils/deepLink';
import { AppConfig } from '../config/app.config';

// Demo mode - uses local storage instead of backend API
const DEMO_MODE = true;
const LOCAL_INTENTS_KEY = 'demo_intents';

interface IntentContextType {
  // State
  intents: PurchaseIntent[];
  pendingIntents: PurchaseIntent[];
  loading: boolean;
  error: string | null;

  // Methods
  createIntent: (request: CreateIntentRequest) => Promise<PurchaseIntent>;
  requestIntentApproval: (intentData: IntentData, mandateId: string) => Promise<string | null>; // Returns mandateId or null if failed
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

  // Reload intents when app comes back from Mandate app
  // (Deep link handling is done in RootNavigator which updates AsyncStorage directly)
  // IntentContext just needs to reload from storage when app regains focus

  /**
   * Helper to get local intents (needed for deep link handler)
   */
  const getLocalIntents = async (): Promise<PurchaseIntent[]> => {
    try {
      const data = await AsyncStorage.getItem(LOCAL_INTENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  /**
   * Helper to save local intents (needed for deep link handler)
   */
  const saveLocalIntents = async (intentsToSave: PurchaseIntent[]): Promise<void> => {
    await AsyncStorage.setItem(LOCAL_INTENTS_KEY, JSON.stringify(intentsToSave));
  };

  /**
   * Request intent approval from Mandate app
   * Opens the Mandate app for user to approve with biometric and sign
   * @param intentData - Product and conditions for the intent
   * @param mandateId - Real mandate ID from mandate service (required - no fake IDs)
   */
  const requestIntentApproval = async (intentData: IntentData, mandateId: string): Promise<string | null> => {
    try {
      setError(null);

      // Clear any existing pending intent data to prevent showing old intent
      await clearPendingIntentData();

      // Open Mandate app with real mandate ID (same as cart flow)
      const opened = await openMandateAppForIntent(intentData, mandateId);
      if (!opened) {
        setError('Failed to open Mandate app');
        return null;
      }

      return mandateId;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to request intent approval';
      setError(errorMessage);
      console.error('Error requesting intent approval:', err);
      return null;
    }
  };

  /**
   * Load all intents and separate pending ones
   */
  const loadIntents = async () => {
    try {
      setLoading(true);
      setError(null);

      let allIntents: PurchaseIntent[];

      if (DEMO_MODE) {
        // Demo mode - load from local storage
        allIntents = await getLocalIntents();
      } else {
        allIntents = await mandateService.getPurchaseIntents();
      }

      setIntents(allIntents);

      // Filter pending intents
      const pending = allIntents.filter(intent => intent.status === 'pending');
      setPendingIntents(pending);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load intents';
      setError(errorMessage);
      console.error('Failed to load intents:', err);
      // In demo mode, just set empty arrays
      if (DEMO_MODE) {
        setIntents([]);
        setPendingIntents([]);
      }
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

      if (DEMO_MODE) {
        // Demo mode - create intent locally
        const newIntent: PurchaseIntent = {
          id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: request.userId || 'demo-user',
          productId: request.productId,
          productName: request.productName || 'Product',
          quantity: request.quantity || 1,
          maxPrice: request.maxPrice,
          status: 'pending',
          agentId: request.agentId || 'default-shopping-agent',
          constraints: request.constraints || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as PurchaseIntent;

        const localIntents = await getLocalIntents();
        localIntents.push(newIntent);
        await saveLocalIntents(localIntents);

        // Reload intents
        await loadIntents();

        return newIntent;
      }

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

      if (DEMO_MODE) {
        // Demo mode - update intent locally
        const localIntents = await getLocalIntents();
        const index = localIntents.findIndex(i => i.id === intentId);
        if (index >= 0) {
          localIntents[index].status = 'approved';
          localIntents[index].updatedAt = new Date();
          await saveLocalIntents(localIntents);
        }
        await loadIntents();
        return;
      }

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

      if (DEMO_MODE) {
        // Demo mode - update intent locally
        const localIntents = await getLocalIntents();
        const index = localIntents.findIndex(i => i.id === intentId);
        if (index >= 0) {
          localIntents[index].status = 'rejected';
          localIntents[index].updatedAt = new Date();
          await saveLocalIntents(localIntents);
        }
        await loadIntents();
        return;
      }

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
    requestIntentApproval,
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
