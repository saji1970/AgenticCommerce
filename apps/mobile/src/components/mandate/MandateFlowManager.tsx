import React, { useState, useEffect } from 'react';
import { MandateType } from '@agentic-commerce/shared-types';
import { useMandate } from '../../contexts/MandateContext';
import { MandateSigningModal } from './MandateSigningModal';
import { AppConfig } from '../../config/app.config';

interface MandateFlowManagerProps {
  mandateType: MandateType;
  onMandateReady: () => void;
  onCancel: () => void;
  autoCheck?: boolean; // Automatically check for mandate on mount
}

/**
 * MandateFlowManager
 * Orchestrates the mandate checking and creation flow
 */
export const MandateFlowManager: React.FC<MandateFlowManagerProps> = ({
  mandateType,
  onMandateReady,
  onCancel,
  autoCheck = true,
}) => {
  const { getActiveMandateByType, createMandate, loading } = useMandate();
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (autoCheck) {
      checkMandate();
    }
  }, [autoCheck]);

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
   */
  const handleSignMandate = async () => {
    try {
      const defaultAgent = AppConfig.getDefaultAgent();
      const defaultConstraints = AppConfig.getDefaultConstraints(mandateType);

      await createMandate({
        agentId: defaultAgent.id,
        agentName: defaultAgent.name,
        type: mandateType,
        constraints: defaultConstraints,
      });

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
