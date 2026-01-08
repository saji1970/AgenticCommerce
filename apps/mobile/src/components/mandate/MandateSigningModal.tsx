import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MandateType, CartMandateConstraints, IntentMandateConstraints, PaymentMandateConstraints } from '@agentic-commerce/shared-types';

interface MandateSigningModalProps {
  visible: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
  mandateType: MandateType;
  agentName: string;
  constraints: CartMandateConstraints | IntentMandateConstraints | PaymentMandateConstraints;
  intentDetails?: {
    productName: string;
    criteria: string;
    estimatedPrice?: number;
  };
  estimatedTotal?: number;
  productNames?: string[];
}

export const MandateSigningModal: React.FC<MandateSigningModalProps> = ({
  visible,
  onClose,
  onSign,
  mandateType,
  agentName,
  constraints,
  intentDetails,
  estimatedTotal,
  productNames = [],
}) => {
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSign = async () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please review and agree to the terms before signing');
      return;
    }

    setSigning(true);
    try {
      await onSign();
      setAgreed(false);
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign mandate');
    } finally {
      setSigning(false);
    }
  };

  const renderConstraints = () => {
    switch (mandateType) {
      case MandateType.CART:
        const cartConstraints = constraints as CartMandateConstraints;
        return (
          <View style={styles.constraintsContainer}>
            <Text style={styles.constraintTitle}>Cart Mandate Permissions:</Text>
            {cartConstraints.maxItemValue && (
              <Text style={styles.constraintItem}>
                • Maximum item value: ${cartConstraints.maxItemValue}
              </Text>
            )}
            {cartConstraints.maxItemsPerDay && (
              <Text style={styles.constraintItem}>
                • Daily item limit: {cartConstraints.maxItemsPerDay} items
              </Text>
            )}
            {cartConstraints.allowedCategories && cartConstraints.allowedCategories.length > 0 && (
              <Text style={styles.constraintItem}>
                • Allowed categories: {cartConstraints.allowedCategories.join(', ')}
              </Text>
            )}
            {cartConstraints.blockedCategories && cartConstraints.blockedCategories.length > 0 && (
              <Text style={styles.constraintItem}>
                • Blocked categories: {cartConstraints.blockedCategories.join(', ')}
              </Text>
            )}
          </View>
        );

      case MandateType.INTENT:
        const intentConstraints = constraints as IntentMandateConstraints;
        return (
          <View style={styles.constraintsContainer}>
            <Text style={styles.constraintTitle}>Intent Mandate Permissions:</Text>
            {intentConstraints.maxIntentValue && (
              <Text style={styles.constraintItem}>
                • Maximum intent value: ${intentConstraints.maxIntentValue}
              </Text>
            )}
            {intentConstraints.maxIntentsPerDay && (
              <Text style={styles.constraintItem}>
                • Daily intent limit: {intentConstraints.maxIntentsPerDay}
              </Text>
            )}
            {intentConstraints.autoApproveUnder && (
              <Text style={styles.constraintItem}>
                • Auto-approve purchases under: ${intentConstraints.autoApproveUnder}
              </Text>
            )}
            {intentConstraints.expiryHours && (
              <Text style={styles.constraintItem}>
                • Intent validity: {intentConstraints.expiryHours} hours
              </Text>
            )}
          </View>
        );

      case MandateType.PAYMENT:
        const paymentConstraints = constraints as PaymentMandateConstraints;
        return (
          <View style={styles.constraintsContainer}>
            <Text style={styles.constraintTitle}>Payment Mandate Permissions:</Text>
            {paymentConstraints.maxTransactionAmount && (
              <Text style={styles.constraintItem}>
                • Maximum transaction: ${paymentConstraints.maxTransactionAmount}
              </Text>
            )}
            {paymentConstraints.dailySpendingLimit && (
              <Text style={styles.constraintItem}>
                • Daily spending limit: ${paymentConstraints.dailySpendingLimit}
              </Text>
            )}
            {paymentConstraints.monthlySpendingLimit && (
              <Text style={styles.constraintItem}>
                • Monthly spending limit: ${paymentConstraints.monthlySpendingLimit}
              </Text>
            )}
            {paymentConstraints.allowedPaymentMethods && (
              <Text style={styles.constraintItem}>
                • Payment methods: {paymentConstraints.allowedPaymentMethods.join(', ')}
              </Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const getMandateTitle = () => {
    switch (mandateType) {
      case MandateType.CART:
        return 'Authorize Cart Management';
      case MandateType.INTENT:
        return 'Authorize Purchase Intent';
      case MandateType.PAYMENT:
        return 'Authorize Payment Execution';
      default:
        return 'Sign Mandate';
    }
  };

  const getMandateDescription = () => {
    switch (mandateType) {
      case MandateType.CART:
        return `${agentName} will be able to add items to your shopping cart based on your preferences and shopping history.`;
      case MandateType.INTENT:
        return `${agentName} will monitor prices and conditions to create purchase recommendations for your approval.`;
      case MandateType.PAYMENT:
        return `${agentName} will be able to execute payments for approved purchase intents within the specified limits.`;
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔐</Text>
              </View>
              <Text style={styles.title}>{getMandateTitle()}</Text>
              <Text style={styles.subtitle}>{getMandateDescription()}</Text>
            </View>

            {/* Agent Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Agent</Text>
              <View style={styles.agentCard}>
                <Text style={styles.agentIcon}>🤖</Text>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{agentName}</Text>
                  <Text style={styles.agentDescription}>
                    Powered by Agentic Commerce Protocol
                  </Text>
                </View>
              </View>
            </View>

            {/* Intent Details (for intent mandates) */}
            {mandateType === MandateType.INTENT && intentDetails && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Purchase Intent</Text>
                <View style={styles.intentCard}>
                  <Text style={styles.intentProduct}>{intentDetails.productName}</Text>
                  <Text style={styles.intentCriteria}>{intentDetails.criteria}</Text>
                  {intentDetails.estimatedPrice && (
                    <Text style={styles.intentPrice}>
                      Target Price: ${intentDetails.estimatedPrice}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Cart Items (for cart mandates) */}
            {mandateType === MandateType.CART && productNames.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Items to Add</Text>
                <View style={styles.itemsList}>
                  {productNames.map((name, index) => (
                    <Text key={index} style={styles.itemName}>
                      • {name}
                    </Text>
                  ))}
                  {estimatedTotal && (
                    <Text style={styles.estimatedTotal}>
                      Estimated Total: ${estimatedTotal.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Constraints */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permissions & Limits</Text>
              {renderConstraints()}
            </View>

            {/* Legal Text */}
            <View style={styles.section}>
              <Text style={styles.legalTitle}>Important Information</Text>
              <Text style={styles.legalText}>
                • You can revoke this mandate at any time from your settings
              </Text>
              <Text style={styles.legalText}>
                • All actions will be logged and visible in your transaction history
              </Text>
              <Text style={styles.legalText}>
                • The AI agent will only operate within the specified limits
              </Text>
              <Text style={styles.legalText}>
                • You retain full control and can review all actions
              </Text>
            </View>

            {/* Agreement Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and agree to authorize this AI agent with the permissions specified above
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={signing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.signButton,
                (!agreed || signing) && styles.signButtonDisabled,
              ]}
              onPress={handleSign}
              disabled={!agreed || signing}
            >
              {signing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signButtonText}>Sign Mandate</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  agentIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  intentCard: {
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  intentProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  intentCriteria: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  intentPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  itemsList: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  estimatedTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  constraintsContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  constraintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  constraintItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  legalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  legalText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 24,
    paddingTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  signButton: {
    backgroundColor: '#4F46E5',
  },
  signButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  signButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
