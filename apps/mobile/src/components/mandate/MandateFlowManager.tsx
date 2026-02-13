import React, { useState, useEffect } from 'react';
import { Linking, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MandateType } from '@agentic-commerce/shared-types';
import { useMandate } from '../../contexts/MandateContext';
import { MandateSigningModal } from './MandateSigningModal';
import { AppConfig } from '../../config/app.config';
import { openMandateApp } from '../../utils/deepLink';
import { mandateServiceClient } from '../../services/mandate-service.client';
import { storageService } from '../../services/storage.service';

const MANDATE_TOKEN_KEY = 'mandate_token';

interface MandateFlowManagerProps {
  mandateType: MandateType;
  onMandateReady: () => void;
  onCancel: () => void;
  autoCheck?: boolean; // Automatically check for mandate on mount
}

/**
 * MandateFlowManager
 * Orchestrates the mandate checking and creation flow
 * Always shows the signing modal, then opens the Mandate app for biometric signing
 */
export const MandateFlowManager: React.FC<MandateFlowManagerProps> = ({
  mandateType,
  onMandateReady,
  onCancel,
  autoCheck = true,
}) => {
  const { loadMandates, loading } = useMandate();
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [waitingForMandateApp, setWaitingForMandateApp] = useState(false);

  useEffect(() => {
    if (autoCheck) {
      checkMandate();
    }
  }, [autoCheck]);

  // Listen for return from mandate app
  useEffect(() => {
    if (!waitingForMandateApp) return;

    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && waitingForMandateApp) {
        // User returned from mandate app - reload mandates and proceed
        console.log('[MandateFlowManager] App returned to foreground, checking mandate status');
        setWaitingForMandateApp(false);
        const freshMandates = await loadMandates();
        const mandate = freshMandates[mandateType as keyof typeof freshMandates];
        if (mandate) {
          onMandateReady();
        }
        // If no mandate found, user may have rejected - do nothing (they can try again)
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Also listen for deep link callbacks
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith('agenticcommerce://payment-callback') ||
          url.startsWith('agenticcommerce://intent-callback')) {
        console.log('[MandateFlowManager] Deep link callback received:', url);
        setWaitingForMandateApp(false);
        // The RootNavigator will handle the callback details
        // We just need to signal mandate is ready
        onMandateReady();
      }
    });

    return () => {
      subscription.remove();
      linkSubscription.remove();
    };
  }, [waitingForMandateApp, mandateType]);

  /**
   * Always show signing modal for user consent
   */
  const checkMandate = async () => {
    if (checking || loading) return;

    setChecking(true);
    try {
      // Always show signing modal so user explicitly consents each time
      setShowSigningModal(true);
    } catch (error) {
      console.error('Error checking mandate:', error);
      onCancel();
    } finally {
      setChecking(false);
    }
  };

  /**
   * Handle mandate signing
   * Registers a pending mandate (without auto-approving), then opens Mandate app
   * so the user can approve it via biometric signing in the mandate app
   */
  const handleSignMandate = async () => {
    try {
      const defaultAgent = AppConfig.getDefaultAgent();
      const defaultConstraints = AppConfig.getDefaultConstraints(mandateType);

      // Get user ID for registration
      const user = await storageService.getUser();
      if (!user || !user.id) {
        throw new Error('User not logged in');
      }

      // Always register a NEW mandate without approving it.
      // This keeps it in "pending" status so the mandate app shows the signing UI.
      const pendingMandate = await mandateServiceClient.registerMandate({
        userId: user.id,
        agentId: defaultAgent.id,
        agentName: defaultAgent.name,
        type: mandateType as 'cart' | 'intent' | 'payment',
        constraints: defaultConstraints,
      });

      console.log('[MandateFlowManager] Registered pending mandate:', pendingMandate.id, 'status:', pendingMandate.status);

      setShowSigningModal(false);

      // Open mandate app for biometric signing
      console.log('[MandateFlowManager] Opening mandate app for signing, mandateId:', pendingMandate.id);
      const opened = await openMandateApp(pendingMandate.id);

      if (opened) {
        // Wait for user to return from mandate app
        setWaitingForMandateApp(true);
      } else {
        // Mandate app not available - auto-approve as fallback
        console.log('[MandateFlowManager] Mandate app not available, auto-approving');
        const approveResult = await mandateServiceClient.approveMandate(pendingMandate.id, user.id);
        // Store mandate token from auto-approve response
        if (approveResult.mandateToken) {
          console.log('[MandateFlowManager] Storing mandate token from auto-approve');
          await AsyncStorage.setItem(MANDATE_TOKEN_KEY, approveResult.mandateToken);
        }
        await loadMandates();
        onMandateReady();
      }
    } catch (error) {
      throw error; // Let modal handle the error
    }
  };

  /**
   * Handle modal cancellation
   */
  const handleCancelSigning = () => {
    setShowSigningModal(false);
    onCancel();
  };

  // Get default agent and constraints for modal
  const defaultAgent = AppConfig.getDefaultAgent();
  const defaultConstraints = AppConfig.getDefaultConstraints(mandateType);

  return (
    <MandateSigningModal
      visible={showSigningModal}
      onClose={handleCancelSigning}
      onSign={handleSignMandate}
      mandateType={mandateType}
      agentName={defaultAgent.name}
      constraints={defaultConstraints}
    />
  );
};
