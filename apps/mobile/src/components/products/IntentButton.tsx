import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import {
  Product,
  MandateType,
  CreateIntentRequest,
  PurchaseIntentItem,
} from '@agentic-commerce/shared-types';
import { useMandate } from '../../contexts/MandateContext';
import { useIntent } from '../../contexts/IntentContext';
import { AppConfig } from '../../config/app.config';
import { MandateFlowManager } from '../mandate/MandateFlowManager';
import { IntentCreationModal } from './IntentCreationModal';
import { IntentConditions } from '../../types/intent.types';

interface IntentButtonProps {
  product: Product;
  variant?: 'full' | 'compact' | 'icon';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * IntentButton
 * Handles purchase intent creation with mandate flow
 */
export const IntentButton: React.FC<IntentButtonProps> = ({
  product,
  variant = 'full',
  onSuccess,
  onError,
}) => {
  const { getActiveMandateByType, loadMandates } = useMandate();
  const { createIntent, requestIntentApproval } = useIntent();
  const [showMandateFlow, setShowMandateFlow] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Handle intent button press
   */
  const handlePress = () => {
    try {
      console.log('[IntentButton] Pressed for product:', product.id, product.name);

      if (!product || !product.id) {
        console.error('[IntentButton] Invalid product:', product);
        Alert.alert('Error', 'Invalid product data');
        return;
      }

      // Always show mandate signing UI for user consent, even if mandate exists
      console.log('[IntentButton] Starting mandate flow for user consent');
      setShowMandateFlow(true);
    } catch (error: any) {
      console.error('[IntentButton] Error in handlePress:', error);
      Alert.alert('Error', `Failed to process intent action: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Handle mandate ready (created or already exists)
   */
  const handleMandateReady = async () => {
    setShowMandateFlow(false);
    // Reload mandates and use returned value directly to avoid React state timing issues
    const freshMandates = await loadMandates();
    const mandate = freshMandates.intent;
    console.log('[IntentButton] handleMandateReady - freshMandates:', freshMandates, 'intent mandate:', mandate);
    if (mandate) {
      setShowIntentModal(true);
    } else {
      console.warn('[IntentButton] No intent mandate found after loading mandates');
    }
  };

  /**
   * Handle mandate flow cancellation
   */
  const handleMandateCancel = () => {
    setShowMandateFlow(false);
  };

  /**
   * Handle intent confirmation and creation
   * Opens Mandate app for biometric approval and signing
   */
  const handleConfirm = async (reasoning: string, conditions: IntentConditions) => {
    setLoading(true);

    try {
      const defaultAgent = AppConfig.getDefaultAgent();

      // Prepare intent data for Mandate app
      const intentData = {
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || product.image,
        price: product.price,
        quantity: 1,
        maxPrice: conditions.maxPrice || product.price,
        reasoning,
        agentName: defaultAgent.name,
      };

      // Request approval from Mandate app
      const mandateId = await requestIntentApproval(intentData);

      if (mandateId) {
        setShowIntentModal(false);
        // Intent will be created after user approves in Mandate app
        // and returns via deep link callback
        Alert.alert(
          'Approval Required',
          'Please approve the intent in the Mandate app using biometric verification and signing.'
        );
      } else {
        Alert.alert('Error', 'Failed to open Mandate app for approval');
      }
    } catch (error: any) {
      console.error('Failed to request intent approval:', error);
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to create intent';
      Alert.alert('Error', errorMessage);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle intent creation cancellation
   */
  const handleCancel = () => {
    setShowIntentModal(false);
  };

  /**
   * Render button based on variant
   */
  const renderButton = () => {
    if (variant === 'icon') {
      return (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.iconText}>⭐</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (variant === 'compact') {
      return (
        <TouchableOpacity
          style={[styles.compactButton, loading && styles.buttonDisabled]}
          onPress={handlePress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.compactButtonText}>Intent</Text>
          )}
        </TouchableOpacity>
      );
    }

    // Full variant (default)
    return (
      <TouchableOpacity
        style={[styles.fullButton, loading && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.fullButtonIcon}>⭐</Text>
            <Text style={styles.fullButtonText}>Create Intent</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const mandate = getActiveMandateByType(MandateType.INTENT);

  return (
    <>
      {renderButton()}

      {/* Mandate Flow Manager */}
      {showMandateFlow && (
        <MandateFlowManager
          mandateType={MandateType.INTENT}
          onMandateReady={handleMandateReady}
          onCancel={handleMandateCancel}
          autoCheck={true}
        />
      )}

      {/* Intent Creation Modal */}
      {showIntentModal && (
        <IntentCreationModal
          visible={showIntentModal}
          product={product}
          mandate={mandate}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Full Button (default)
  fullButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fullButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Compact Button
  compactButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Icon Button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff5e6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  iconText: {
    fontSize: 20,
  },

  // Common
  buttonDisabled: {
    opacity: 0.6,
  },
});
