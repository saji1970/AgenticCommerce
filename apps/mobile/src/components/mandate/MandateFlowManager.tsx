import React, { useState, useEffect, useRef } from 'react';
import { MandateType, MandateStatus } from '@agentic-commerce/shared-types';
import { useMandate } from '../../contexts/MandateContext';
import { MandateSigningModal } from './MandateSigningModal';
import { AppConfig } from '../../config/app.config';
import { AppState, AppStateStatus } from 'react-native';

interface MandateFlowManagerProps {
  mandateType: MandateType;
  onMandateReady: () => void;
  onCancel: () => void;
  autoCheck?: boolean; // Automatically check for mandate on mount
}

/**
 * MandateFlowManager
 * Orchestrates the mandate checking and creation flow
 * For CART/PAYMENT mandates, opens Mandate app for user approval
 */
export const MandateFlowManager: React.FC<MandateFlowManagerProps> = ({
  mandateType,
  onMandateReady,
  onCancel,
  autoCheck = true,
}) => {
  const { getActiveMandateByType, createMandate, loadMandates, loading } = useMandate();
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const pendingMandateId = useRef<string | null>(null);

  useEffect(() => {
    if (autoCheck) {
      checkMandate();
    }
  }, [autoCheck]);

  // Listen for app state changes to detect when user returns from Mandate app
  useEffect(() => {
    if (!waitingForApproval) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && waitingForApproval) {
        console.log('[MandateFlowManager] App became active, checking mandate status...');
        // User returned from Mandate app, check if mandate was approved
        const freshMandates = await loadMandates();
        const mandate = freshMandates[mandateType as keyof typeof freshMandates];

        if (mandate && mandate.status === MandateStatus.ACTIVE) {
          console.log('[MandateFlowManager] Mandate approved:', mandate.id);
          setWaitingForApproval(false);
          pendingMandateId.current = null;
          setShowSigningModal(false);
          onMandateReady();
        } else {
          console.log('[MandateFlowManager] Mandate not yet approved, status:', mandate?.status);
          // User returned but didn't approve - they can try again or cancel
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [waitingForApproval, mandateType, loadMandates, onMandateReady]);

  /**
   * Check if mandate exists, if not show signing modal
   */
  const checkMandate = async () => {
    if (checking || loading) return;

    setChecking(true);
    try {
      const mandate = getActiveMandateByType(mandateType);

      if (mandate) {
        // Mandate exists, proceed
        onMandateReady();
      } else {
        // No mandate, show signing modal
        setShowSigningModal(true);
      }
    } catch (error) {
      console.error('Error checking mandate:', error);
      onCancel();
    } finally {
      setChecking(false);
    }
  };

  /**
   * Handle mandate signing
   * For CART/PAYMENT, this creates a pending mandate and opens Mandate app
   */
  const handleSignMandate = async () => {
    try {
      const defaultAgent = AppConfig.getDefaultAgent();
      const defaultConstraints = AppConfig.getDefaultConstraints(mandateType);

      const mandate = await createMandate({
        agentId: defaultAgent.id,
        agentName: defaultAgent.name,
        type: mandateType,
        constraints: defaultConstraints,
      });

      // For CART/PAYMENT mandates, createMandate opens Mandate app
      // We need to wait for user to return with approval
      if (mandateType === MandateType.CART || mandateType === MandateType.PAYMENT) {
        console.log('[MandateFlowManager] Waiting for mandate approval from Mandate app...');
        pendingMandateId.current = mandate.id;
        setWaitingForApproval(true);
        // Don't close modal yet - user will return from Mandate app
        return;
      }

      // For INTENT mandates, proceed immediately (they have their own approval)
      setShowSigningModal(false);
      onMandateReady();
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
