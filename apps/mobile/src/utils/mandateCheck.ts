import { mandateServiceClient } from '../services/mandate-service.client';
import { storageService } from '../services/storage.service';
import { openMandateApp } from './deepLink';
import { Alert } from 'react-native';
import { PaymentMandateConstraints, CartMandateConstraints, IntentMandateConstraints } from '@agentic-commerce/shared-types';

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
  constraints: PaymentMandateConstraints
): Promise<{ mandateId: string }> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
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
    const opened = await openMandateApp(mandate.id);
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

    const mandate = await mandateServiceClient.registerMandate({
      userId: user.id,
      agentId,
      agentName,
      type: 'cart',
      constraints,
    });

    const opened = await openMandateApp(mandate.id);
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

    const mandate = await mandateServiceClient.registerMandate({
      userId: user.id,
      agentId,
      agentName,
      type: 'intent',
      constraints,
    });

    const opened = await openMandateApp(mandate.id);
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
 * Approve a mandate (this is now handled in the Mandate app)
 * This function is kept for backward compatibility but does nothing
 */
export async function approveMandate(mandateId: string): Promise<void> {
  // Approval is now handled in the Mandate app
  // This function is kept for backward compatibility
  console.log('Mandate approval is handled in the Mandate app');
}
