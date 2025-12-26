/**
 * React Native Hook for AP2 Mandate Management
 * Provides easy-to-use interface for mandate operations in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { AP2MandateManager, AP2ApiService } from '../services/AP2MandateManager';
import {
  SignedMandate,
  IntentMandate,
  CartMandate,
  AP2TransactionResult,
} from '@agentic-commerce/shared';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as LocalAuthentication from 'expo-local-authentication';

interface UseAP2MandatesReturn {
  // State
  currentIntentMandate: SignedMandate<IntentMandate> | null;
  isCreatingIntent: boolean;
  isCreatingCart: boolean;
  isProcessingPayment: boolean;
  error: string | null;

  // Actions
  createIntentMandate: (request: string, maxPrice: number, options?: any) => Promise<SignedMandate<IntentMandate> | null>;
  createCartMandate: (
    intentMandateId: string,
    items: any[],
    merchant: any,
    options?: any
  ) => Promise<SignedMandate<CartMandate> | null>;
  processPayment: (cartMandateId: string, paymentMethodId: string) => Promise<AP2TransactionResult | null>;
  revokeMandate: (mandateId: string, reason?: string) => Promise<void>;
  getUserMandates: (type: 'intent' | 'cart', status?: string) => Promise<any[]>;
}

export const useAP2Mandates = (): UseAP2MandatesReturn => {
  const user = useSelector((state: RootState) => state.auth.user);
  const authToken = useSelector((state: RootState) => state.auth.token);

  const [mandateManager, setMandateManager] = useState<AP2MandateManager | null>(null);
  const [apiService, setApiService] = useState<AP2ApiService | null>(null);
  const [currentIntentMandate, setCurrentIntentMandate] = useState<SignedMandate<IntentMandate> | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize managers
  useEffect(() => {
    if (user?.id && authToken) {
      const manager = new AP2MandateManager(user.id);
      manager.initialize().then(() => {
        setMandateManager(manager);
        console.log('AP2 Mandate Manager initialized');
      });

      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const api = new AP2ApiService(baseUrl, authToken);
      setApiService(api);
    }
  }, [user?.id, authToken]);

  /**
   * Request biometric authentication before sensitive operations
   */
  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Biometrics not available, proceed anyway (in production, you might want to require it)
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to approve mandate',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      // Check if result exists and has success property
      if (!result) {
        return false;
      }

      return result.success ?? false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      // On error, allow the operation to proceed (or return false if you want to block it)
      return true;
    }
  };

  /**
   * Create Intent Mandate
   */
  const createIntentMandate = useCallback(
    async (
      request: string,
      maxPrice: number,
      options?: {
        minPrice?: number;
        timeLimitHours?: number;
        approvedMerchants?: string[];
        blockedMerchants?: string[];
        categories?: string[];
      }
    ): Promise<SignedMandate<IntentMandate> | null> => {
      if (!mandateManager || !apiService) {
        setError('Mandate manager not initialized');
        return null;
      }

      setIsCreatingIntent(true);
      setError(null);

      try {
        // Create signed mandate locally
        const signedMandate = await mandateManager.createIntentMandate(
          request,
          maxPrice,
          options
        );

        // Send to backend for storage and verification
        const serverMandate = await apiService.createIntentMandate(signedMandate);

        setCurrentIntentMandate(serverMandate);
        console.log('Intent Mandate created:', serverMandate.mandate.mandate_id);

        return serverMandate;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create Intent Mandate';
        setError(errorMessage);
        console.error('Error creating Intent Mandate:', err);
        return null;
      } finally {
        setIsCreatingIntent(false);
      }
    },
    [mandateManager, apiService]
  );

  /**
   * Create Cart Mandate
   */
  const createCartMandate = useCallback(
    async (
      intentMandateId: string,
      items: Array<{
        product_id: string;
        name: string;
        description?: string;
        quantity: number;
        unit_price: number;
        merchant_sku?: string;
      }>,
      merchant: {
        merchant_id: string;
        name: string;
      },
      options?: {
        paymentMethodId?: string;
        shippingAddress?: any;
      }
    ): Promise<SignedMandate<CartMandate> | null> => {
      if (!mandateManager || !apiService) {
        setError('Mandate manager not initialized');
        return null;
      }

      setIsCreatingCart(true);
      setError(null);

      try {
        // Request biometric authentication for Cart Mandate
        const authenticated = await authenticateWithBiometrics();
        if (!authenticated) {
          throw new Error('Authentication required to create Cart Mandate');
        }

        // Create signed mandate locally
        const signedMandate = await mandateManager.createCartMandate(
          intentMandateId,
          items,
          merchant,
          options
        );

        // Send to backend for validation and storage
        const serverMandate = await apiService.createCartMandate(signedMandate);

        console.log('Cart Mandate created:', serverMandate.mandate.mandate_id);

        return serverMandate;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create Cart Mandate';
        setError(errorMessage);
        console.error('Error creating Cart Mandate:', err);
        return null;
      } finally {
        setIsCreatingCart(false);
      }
    },
    [mandateManager, apiService]
  );

  /**
   * Process payment with Cart Mandate
   */
  const processPayment = useCallback(
    async (
      cartMandateId: string,
      paymentMethodId: string
    ): Promise<AP2TransactionResult | null> => {
      if (!apiService) {
        setError('API service not initialized');
        return null;
      }

      setIsProcessingPayment(true);
      setError(null);

      try {
        // Request biometric authentication for payment
        const authenticated = await authenticateWithBiometrics();
        if (!authenticated) {
          throw new Error('Authentication required to process payment');
        }

        // Process payment through backend
        const result = await apiService.processPayment(cartMandateId, paymentMethodId);

        console.log('Payment processed:', result.transaction_id);

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
        setError(errorMessage);
        console.error('Error processing payment:', err);
        return null;
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [apiService]
  );

  /**
   * Revoke a mandate
   */
  const revokeMandate = useCallback(
    async (mandateId: string, reason?: string): Promise<void> => {
      if (!apiService) {
        setError('API service not initialized');
        return;
      }

      setError(null);

      try {
        await apiService.revokeMandate(mandateId, reason);

        // Clear current intent mandate if it's the one being revoked
        if (currentIntentMandate?.mandate.mandate_id === mandateId) {
          setCurrentIntentMandate(null);
        }

        console.log('Mandate revoked:', mandateId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to revoke mandate';
        setError(errorMessage);
        console.error('Error revoking mandate:', err);
      }
    },
    [apiService, currentIntentMandate]
  );

  /**
   * Get user's mandates
   */
  const getUserMandates = useCallback(
    async (type: 'intent' | 'cart', status?: string): Promise<any[]> => {
      if (!apiService) {
        setError('API service not initialized');
        return [];
      }

      try {
        const mandates = await apiService.getUserMandates(type, status);
        return mandates;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch mandates';
        setError(errorMessage);
        console.error('Error fetching mandates:', err);
        return [];
      }
    },
    [apiService]
  );

  return {
    currentIntentMandate,
    isCreatingIntent,
    isCreatingCart,
    isProcessingPayment,
    error,
    createIntentMandate,
    createCartMandate,
    processPayment,
    revokeMandate,
    getUserMandates,
  };
};
