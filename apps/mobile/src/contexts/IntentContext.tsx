import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { PurchaseIntent, CreateIntentRequest } from '@agentic-commerce/shared-types';
import mandateService from '../services/mandate.service';
import { AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openMandateAppForIntent, IntentData, getPendingIntentData, clearPendingIntentData } from '../utils/deepLink';
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
  requestIntentApproval: (intentData: IntentData) => Promise<string | null>; // Returns mandateId or null if failed
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

  // Handle deep link callback from Mandate app for intent approval
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('[IntentContext] Received deep link:', url);

      if (url.includes('intent-callback')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const status = params.get('status');
        const mandateId = params.get('mandateId');
        const intentId = params.get('intentId');

        console.log('[IntentContext] Intent callback:', { status, mandateId, intentId });

        if (status === 'approved') {
          // Get the pending intent data
          const pendingIntent = await getPendingIntentData();
          if (pendingIntent) {
            // Create the approved intent
            const defaultAgent = AppConfig.getDefaultAgent();
            const newIntent: PurchaseIntent = {
              id: intentId || `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: 'demo-user',
              productId: pendingIntent.productId,
              productName: pendingIntent.productName,
              quantity: pendingIntent.quantity,
              maxPrice: pendingIntent.maxPrice || pendingIntent.price,
              status: 'approved',
              agentId: defaultAgent.id,
              constraints: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            } as PurchaseIntent;

            // Save to local storage
            const localIntents = await getLocalIntents();
            localIntents.push(newIntent);
            await saveLocalIntents(localIntents);

            // Clear pending intent data
            await clearPendingIntentData();

            // Reload intents
            await loadIntents();

            console.log('[IntentContext] Intent approved and saved:', newIntent.id);
          }
        } else {
          // Intent was rejected, clear pending data
          await clearPendingIntentData();
          console.log('[IntentContext] Intent was rejected');
        }
      }
    };

    // Listen for deep links
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

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
   */
  const requestIntentApproval = async (intentData: IntentData): Promise<string | null> => {
    try {
      setError(null);

      // Clear any existing pending intent data to prevent showing old intent
      await clearPendingIntentData();

      // Generate a mandate ID for this intent request
      const mandateId = `intent_mandate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Open Mandate app for approval
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
