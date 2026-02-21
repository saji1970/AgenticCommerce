import { mandateServiceClient } from '../services/mandate-service.client';
import { storageService } from '../services/storage.service';
import { openMandateApp, CartData, saveCartDataForMandate, OpenMandateAppOptions } from './deepLink';
import { Alert } from 'react-native';
import { PaymentMandateConstraints, CartMandateConstraints, IntentMandateConstraints } from '@agentic-commerce/shared-types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production mode - uses mandate service API
const DEMO_MODE = false;
const LOCAL_MANDATES_KEY = 'demo_mandates';

/**
 * Get local mandates from storage (demo mode)
 */
async function getLocalMandates(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_MANDATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save local mandates to storage (demo mode)
 */
async function saveLocalMandates(mandates: any[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_MANDATES_KEY, JSON.stringify(mandates));
}

/**
 * Check if user has an active payment mandate
 */
export async function checkPaymentMandate(agentId: string, agentName: string): Promise<{
  hasMandate: boolean;
  mandateId?: string;
}> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }

    if (DEMO_MODE) {
      // Demo mode - check local storage
      const localMandates = await getLocalMandates();
      const mandate = localMandates.find(
        (m: any) => m.agentId === agentId && m.type === 'payment' && m.status === 'active'
      );
      if (mandate) {
        return { hasMandate: true, mandateId: mandate.id };
      }
      return { hasMandate: false };
    }

    const mandates = await mandateServiceClient.getUserMandates(user.id, 'active', 'payment');
    const mandate = mandates.find(m => m.agentId === agentId);

    if (mandate && mandate.status === 'active') {
      return { hasMandate: true, mandateId: mandate.id };
    }

    return { hasMandate: false };
  } catch (error) {
    console.error('Error checking payment mandate:', error);
    throw error;
  }
}

/**
 * Register a payment mandate and open Mandate app for approval
 */
export async function registerPaymentMandate(
  agentId: string,
  agentName: string,
  constraints: PaymentMandateConstraints,
  cartData?: CartData
): Promise<{ mandateId: string }> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }

    if (DEMO_MODE) {
      // Demo mode - create mandate locally
      const mandateId = `mandate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mandate = {
        id: mandateId,
        userId: user.id,
        agentId,
        agentName,
        type: 'payment',
        status: 'pending',
        constraints,
        createdAt: new Date().toISOString(),
      };

      const localMandates = await getLocalMandates();
      localMandates.push(mandate);
      await saveLocalMandates(localMandates);

      // Save cart data for mandate app to display
      if (cartData) {
        await saveCartDataForMandate(cartData);
      }

      // Open Mandate app for user to approve and sign
      const opened = await openMandateApp(mandateId, { cartData, userId: user.id, userName: user.name });
      if (!opened) {
        Alert.alert(
          'Mandate App Required',
          'Please install the Mandate Manager app to approve this mandate.',
          [{ text: 'OK' }]
        );
      }

      return { mandateId };
    }

    // Register mandate with mandate service
    const mandate = await mandateServiceClient.registerMandate({
      userId: user.id,
      agentId,
      agentName,
      type: 'payment',
      constraints,
    });

    // Open Mandate app for user to approve and sign
    const opened = await openMandateApp(mandate.id, { userId: user.id, userName: user.name });
    if (!opened) {
      Alert.alert(
        'Mandate App Required',
        'Please install the Mandate Manager app to approve this mandate. The mandate has been created and is pending your approval.',
        [{ text: 'OK' }]
      );
    }

    return { mandateId: mandate.id };
  } catch (error) {
    console.error('Error registering payment mandate:', error);
    throw error;
  }
}

/**
 * Check if user has an active cart mandate
 */
export async function checkCartMandate(agentId: string, agentName: string): Promise<{
  hasMandate: boolean;
  mandateId?: string;
}> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }

    if (DEMO_MODE) {
      // Demo mode - check local storage
      const localMandates = await getLocalMandates();
      const mandate = localMandates.find(
        (m: any) => m.agentId === agentId && m.type === 'cart' && m.status === 'active'
      );
      if (mandate) {
        return { hasMandate: true, mandateId: mandate.id };
      }
      return { hasMandate: false };
    }

    const mandates = await mandateServiceClient.getUserMandates(user.id, 'active', 'cart');
    const mandate = mandates.find(m => m.agentId === agentId);

    if (mandate && mandate.status === 'active') {
      return { hasMandate: true, mandateId: mandate.id };
    }

    return { hasMandate: false };
  } catch (error) {
    console.error('Error checking cart mandate:', error);
    throw error;
  }
}

/**
 * Register a cart mandate and open Mandate app for approval
 */
export async function registerCartMandate(
  agentId: string,
  agentName: string,
  constraints: CartMandateConstraints
): Promise<{ mandateId: string }> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }

    if (DEMO_MODE) {
      // Demo mode - create mandate locally
      const mandateId = `mandate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mandate = {
        id: mandateId,
        userId: user.id,
        agentId,
        agentName,
        type: 'cart',
        status: 'pending',
        constraints,
        createdAt: new Date().toISOString(),
      };

      const localMandates = await getLocalMandates();
      localMandates.push(mandate);
      await saveLocalMandates(localMandates);

      // Open Mandate app for user to approve and sign
      const opened = await openMandateApp(mandateId, { userId: user.id, userName: user.name });
      if (!opened) {
        Alert.alert(
          'Mandate App Required',
          'Please install the Mandate Manager app to approve this mandate.',
          [{ text: 'OK' }]
        );
      }

      return { mandateId };
    }

    const mandate = await mandateServiceClient.registerMandate({
      userId: user.id,
      agentId,
      agentName,
      type: 'cart',
      constraints,
    });

    const opened = await openMandateApp(mandate.id, { userId: user.id, userName: user.name });
    if (!opened) {
      Alert.alert(
        'Mandate App Required',
        'Please install the Mandate Manager app to approve this mandate.',
        [{ text: 'OK' }]
      );
    }

    return { mandateId: mandate.id };
  } catch (error) {
    console.error('Error registering cart mandate:', error);
    throw error;
  }
}

/**
 * Check if user has an active intent mandate
 */
export async function checkIntentMandate(agentId: string, agentName: string): Promise<{
  hasMandate: boolean;
  mandateId?: string;
}> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }

    if (DEMO_MODE) {
      // Demo mode - check local storage
      const localMandates = await getLocalMandates();
      const mandate = localMandates.find(
        (m: any) => m.agentId === agentId && m.type === 'intent' && m.status === 'active'
      );
      if (mandate) {
        return { hasMandate: true, mandateId: mandate.id };
      }
      return { hasMandate: false };
    }

    const mandates = await mandateServiceClient.getUserMandates(user.id, 'active', 'intent');
    const mandate = mandates.find(m => m.agentId === agentId);

    if (mandate && mandate.status === 'active') {
      return { hasMandate: true, mandateId: mandate.id };
    }

    return { hasMandate: false };
  } catch (error) {
    console.error('Error checking intent mandate:', error);
    throw error;
  }
}

/**
 * Register an intent mandate and open Mandate app for approval
 */
export async function registerIntentMandate(
  agentId: string,
  agentName: string,
  constraints: IntentMandateConstraints
): Promise<{ mandateId: string }> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }

    if (DEMO_MODE) {
      // Demo mode - create mandate locally
      const mandateId = `mandate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mandate = {
        id: mandateId,
        userId: user.id,
        agentId,
        agentName,
        type: 'intent',
        status: 'pending',
        constraints,
        createdAt: new Date().toISOString(),
      };

      const localMandates = await getLocalMandates();
      localMandates.push(mandate);
      await saveLocalMandates(localMandates);

      // Open Mandate app for user to approve and sign
      const opened = await openMandateApp(mandateId, { userId: user.id, userName: user.name });
      if (!opened) {
        Alert.alert(
          'Mandate App Required',
          'Please install the Mandate Manager app to approve this mandate.',
          [{ text: 'OK' }]
        );
      }

      return { mandateId };
    }

    const mandate = await mandateServiceClient.registerMandate({
      userId: user.id,
      agentId,
      agentName,
      type: 'intent',
      constraints,
    });

    const opened = await openMandateApp(mandate.id, { userId: user.id, userName: user.name });
    if (!opened) {
      Alert.alert(
        'Mandate App Required',
        'Please install the Mandate Manager app to approve this mandate.',
        [{ text: 'OK' }]
      );
    }

    return { mandateId: mandate.id };
  } catch (error) {
    console.error('Error registering intent mandate:', error);
    throw error;
  }
}

/**
 * Approve a mandate (demo mode: updates local storage)
 */
export async function approveMandate(mandateId: string): Promise<void> {
  if (DEMO_MODE) {
    const localMandates = await getLocalMandates();
    const index = localMandates.findIndex((m: any) => m.id === mandateId);
    if (index >= 0) {
      localMandates[index].status = 'active';
      localMandates[index].approvedAt = new Date().toISOString();
      await saveLocalMandates(localMandates);
      console.log('Mandate approved locally:', mandateId);
    }
  } else {
    console.log('Mandate approval is handled in the Mandate app');
  }
}

/**
 * Get a mandate by ID (demo mode)
 */
export async function getMandateById(mandateId: string): Promise<any | null> {
  if (DEMO_MODE) {
    const localMandates = await getLocalMandates();
    return localMandates.find((m: any) => m.id === mandateId) || null;
  }
  return null;
}

/**
 * Handle deep link callback from the Mandate App.
 * Updates the local mandate status based on the callback parameters.
 */
export async function handleMandateCallback(
  mandateId: string,
  status: string
): Promise<void> {
  if (status === 'approved') {
    await approveMandate(mandateId);
    console.log('Mandate callback processed - approved:', mandateId);
  } else if (status === 'rejected') {
    if (DEMO_MODE) {
      const localMandates = await getLocalMandates();
      const index = localMandates.findIndex((m: any) => m.id === mandateId);
      if (index >= 0) {
        localMandates[index].status = 'rejected';
        localMandates[index].updatedAt = new Date().toISOString();
        await saveLocalMandates(localMandates);
      }
    }
    console.log('Mandate callback processed - rejected:', mandateId);
  }
}

/**
 * Validate mandate for a transaction
 * Used to check if an agent has a valid mandate before processing a payment
 */
export async function validateMandateForTransaction(
  agentId: string,
  transactionAmount?: number
): Promise<boolean> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      console.error('User not logged in for mandate validation');
      return false;
    }

    const result = await mandateServiceClient.validateMandate({
      userId: user.id,
      agentId,
      mandateType: 'payment',
      transactionAmount,
    });

    return result.valid;
  } catch (error) {
    console.error('Error validating mandate for transaction:', error);
    // On network errors, check if mandate exists locally as fallback
    try {
      const mandates = await mandateServiceClient.getUserMandates(
        (await storageService.getUser())?.id || '',
        'active',
        'payment'
      );
      const activeMandate = mandates.find(m => m.agentId === agentId && m.status === 'active');
      return !!activeMandate;
    } catch {
      return false;
    }
  }
}
