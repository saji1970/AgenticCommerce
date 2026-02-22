import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import {
  Product,
  MandateType,
} from '@agentic-commerce/shared-types';
import { useMandate } from '../../contexts/MandateContext';
import { useIntent } from '../../contexts/IntentContext';
import { AppConfig } from '../../config/app.config';
import { IntentCreationModal } from './IntentCreationModal';
import { IntentConditions } from '../../types/intent.types';
import { mandateServiceClient } from '../../services/mandate-service.client';
import { storageService } from '../../services/storage.service';

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
  const { getActiveMandateByType } = useMandate();
  const { requestIntentApproval } = useIntent();
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Handle intent button press
   * Show intent details modal FIRST (price drop, scheduled date, etc.) so user can specify
   * what kind of intent they want before any mandate flow.
   */
  const handlePress = () => {
    try {
      console.log('[IntentButton] Pressed for product:', product.id, product.name);

      if (!product || !product.id) {
        console.error('[IntentButton] Invalid product:', product);
        Alert.alert('Error', 'Invalid product data');
        return;
      }

      // Show intent details UI first (price change, scheduled date, etc.)
      console.log('[IntentButton] Showing intent creation modal');
      setShowIntentModal(true);
    } catch (error: any) {
      console.error('[IntentButton] Error in handlePress:', error);
      Alert.alert('Error', `Failed to process intent action: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Open Mandate app with intent data for approval.
   * Uses explicit mandateId to avoid stale cache issues.
   */
  const doRequestIntentApproval = async (reasoning: string, conditions: IntentConditions, explicitMandateId: string) => {
    const defaultAgent = AppConfig.getDefaultAgent();
    const intentData = {
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl || product.image,
      price: product.price,
      quantity: 1,
      maxPrice: conditions.maxPrice || product.price,
      reasoning,
      agentName: defaultAgent.name,
      intentType: conditions.type,
      targetPrice: conditions.targetPrice,
      scheduledDate: conditions.scheduledDate ? conditions.scheduledDate.toISOString() : undefined,
      customReasoning: conditions.customReasoning,
    };

    const mandateId = await requestIntentApproval(intentData, explicitMandateId);
    if (mandateId) {
      setShowIntentModal(false);
      Alert.alert(
        'Approval Required',
        'Please approve the intent in the Mandate app using biometric verification and signing.'
      );
    } else {
      Alert.alert('Error', 'Failed to open Mandate app for approval');
    }
  };

  /**
   * Handle intent confirmation and creation.
   * Always creates a NEW pending intent mandate for each intent request.
   * Never reuses cached/active mandates — each intent needs its own approval context.
   */
  const handleConfirm = async (reasoning: string, conditions: IntentConditions) => {
    setLoading(true);
    try {
      const defaultAgent = AppConfig.getDefaultAgent();
      const user = await storageService.getUser();
      if (!user?.id) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      // Find parent app mandate for hierarchy
      let parentMandateId: string | undefined;
      try {
        const appMandates = await mandateServiceClient.getUserAppMandates(user.id);
        const activeApp = appMandates.find((m: any) => m.status === 'active');
        if (activeApp) parentMandateId = activeApp.id;
      } catch (e) {
        console.warn('[IntentButton] Could not check app mandates:', e);
      }

      // Always register a NEW pending intent mandate — don't reuse cached ones
      // Include product data in constraints so mandate detail can display it later
      const defaultConstraints = AppConfig.getDefaultConstraints(MandateType.INTENT);
      const newMandate = await mandateServiceClient.registerMandate({
        userId: user.id,
        agentId: defaultAgent.id,
        agentName: defaultAgent.name,
        type: 'intent',
        constraints: {
          ...defaultConstraints,
          productId: product.id,
          productName: product.name,
          productImage: product.imageUrl || product.image,
          productPrice: product.price,
          intentType: conditions.type,
          targetPrice: conditions.targetPrice,
          scheduledDate: conditions.scheduledDate ? conditions.scheduledDate.toISOString() : undefined,
          reasoning: reasoning,
        },
        parentMandateId,
      });
      console.log('[IntentButton] Created new pending intent mandate:', newMandate.id, 'status:', newMandate.status);

      // Open Mandate app with the NEW pending mandate ID and full intent data
      await doRequestIntentApproval(reasoning, conditions, newMandate.id);
    } catch (error: any) {
      console.error('Failed to request intent approval:', error);
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to create intent';
      Alert.alert('Error', errorMessage);
      if (onError) onError(error);
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
