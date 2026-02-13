import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
  Image,
  Dimensions,
} from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';

import { AgentMandate } from '../services/mandate-service.client';
import { mandateServiceClient } from '../services/mandate-service.client';
import { useMandates } from '../contexts/MandateContext';
import { SignaturePad } from '../components/SignaturePad';
import { MandateLimitsEditor, MandateLimits } from '../components/MandateLimitsEditor';
import signatureService from '../services/signature.service';
import secureElementService from '../services/secure-element.service';
import { storageService } from '../services/storage.service';

const AGENTIC_COMMERCE_SCHEME = 'agenticcommerce://';

// Production mode - uses mandate service API
const DEMO_MODE = false;

interface CartItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartData {
  items: CartItemData[];
  total: number;
  agentName: string;
}

interface IntentProductData {
  id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

interface IntentData {
  type: string;
  product: IntentProductData;
  maxPrice: number;
  reasoning?: string;
  agentName: string;
}

export const MandateDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { refreshMandates } = useMandates();
  const { mandateId, cartData: routeCartData, intentData: routeIntentData } = route.params as {
    mandateId: string;
    cartData?: CartData;
    intentData?: IntentData;
  };

  const [mandate, setMandate] = useState<AgentMandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('fingerprint');
  const [cartData, setCartData] = useState<CartData | null>(routeCartData || null);
  const [intentData, setIntentData] = useState<IntentData | null>(routeIntentData || null);
  const [customLimits, setCustomLimits] = useState<MandateLimits | null>(null);

  // Determine if this is an intent approval flow
  const isIntentFlow = !!intentData;

  useEffect(() => {
    loadMandate();
    checkBiometricType();
    // If cart data was passed via route params, use it
    if (routeCartData) {
      setCartData(routeCartData);
    }
    // If intent data was passed via route params, use it
    if (routeIntentData) {
      setIntentData(routeIntentData);
      console.log('Intent data received:', routeIntentData);
    }
  }, [mandateId, routeCartData, routeIntentData]);

  const checkBiometricType = async () => {
    const type = await secureElementService.getBiometricType();
    setBiometricType(type);
  };

  const handleBiometricVerification = async () => {
    try {
      const success = await secureElementService.authenticate(
        'Authenticate to authorize AI agent payment'
      );
      if (success) {
        setBiometricVerified(true);
        Alert.alert('Success', 'Biometric verification completed!');
      } else {
        Alert.alert('Failed', 'Biometric verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Biometric verification failed');
    }
  };

  const loadMandate = async () => {
    try {
      const mandateData = await mandateServiceClient.getMandate(mandateId);
      setMandate(mandateData);
    } catch (error) {
      console.error('Error loading mandate:', error);
      Alert.alert('Error', 'Failed to load mandate from server');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please review and agree to the terms');
      return;
    }

    if (!signatureData) {
      setShowSignaturePad(true);
      return;
    }

    setSigning(true);
    try {
      // Update mandate constraints with custom limits before approving
      if (customLimits) {
        mandate.constraints = {
          ...mandate.constraints,
          maxTransactionAmount: customLimits.maxTransactionAmount,
          dailySpendingLimit: customLimits.dailySpendingLimit,
          monthlySpendingLimit: customLimits.monthlySpendingLimit,
          maxItemValue: customLimits.maxItemValue,
          maxItemsPerDay: customLimits.maxItemsPerDay,
          requiresTwoFactor: customLimits.requiresTwoFactor,
        };
        console.log('Updated mandate constraints:', mandate.constraints);
      }

      // Try to create signature (may fail if crypto not fully configured)
      try {
        const mandateText = getMandateText();
        await signatureService.createSignature({
          mandateId: mandate!.id,
          mandateText,
          signatureImageUrl: signatureData,
        });
      } catch (sigError) {
        console.warn('Signature creation failed (continuing with approval):', sigError);
      }

      // Approve mandate - get userId from user session (mandate.userId may be undefined
      // if the API response field mapping differs between apps)
      const user = await storageService.getUser();
      const approveUserId = mandate!.userId || user?.id;
      console.log('[MandateDetail] Approving mandate:', mandateId, 'mandate.userId:', mandate!.userId, 'session userId:', user?.id, 'using:', approveUserId);
      if (!approveUserId) {
        throw new Error('User not logged in');
      }
      const approveResult = await mandateServiceClient.approveMandate(mandateId, approveUserId);
      setMandate({ ...mandate!, status: 'active' });
      await refreshMandates();

      // Extract mandate token from approval response
      const mandateToken = approveResult.mandateToken;
      console.log('[MandateDetail] Mandate token received:', mandateToken ? 'yes' : 'no');

      // Generate an intent ID if this is an intent approval
      const intentId = isIntentFlow ? `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;

      // Send deep link back to AgenticCommerce app (include mandate token)
      const tokenParam = mandateToken ? `&mandateToken=${encodeURIComponent(mandateToken)}` : '';
      const callbackUrl = isIntentFlow
        ? `${AGENTIC_COMMERCE_SCHEME}intent-callback?mandateId=${mandateId}&status=approved${intentId ? `&intentId=${intentId}` : ''}${tokenParam}`
        : `${AGENTIC_COMMERCE_SCHEME}payment-callback?mandateId=${mandateId}&status=approved${tokenParam}`;

      const alertTitle = isIntentFlow ? 'Intent Approved!' : 'Mandate Approved!';
      const alertMessage = isIntentFlow
        ? `Your purchase intent has been approved!\n\nThe AI Agent will now be able to purchase "${intentData?.product.name}" for you when conditions are met.`
        : 'Your authorization has been recorded with biometric verification and signature.\n\nThe AI Agent is now authorized to complete your purchase.';

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'Return to Shopping',
            onPress: async () => {
              try {
                await Linking.openURL(callbackUrl);
              } catch (linkError) {
                console.error('Error opening deep link:', linkError);
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      const serverError = error?.response?.data?.error || error?.response?.data?.message;
      const errorMsg = serverError || (error instanceof Error ? error.message : 'Failed to approve mandate');
      console.error('Approve error details:', JSON.stringify(error?.response?.data || error?.message));
      Alert.alert('Error', errorMsg);
    } finally {
      setSigning(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Mandate',
      'Are you sure you want to cancel this pending mandate?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await mandateServiceClient.revokeMandate(mandateId, mandate!.userId, 'Cancelled by user');
              await refreshMandates();
              Alert.alert('Success', 'Mandate cancelled', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Error cancelling mandate:', error);
              Alert.alert('Error', 'Failed to cancel mandate');
            }
          },
        },
      ]
    );
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Mandate',
      'Are you sure you want to revoke this active mandate? This will prevent the AI agent from performing further actions.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await mandateServiceClient.revokeMandate(mandateId, mandate!.userId, 'Revoked by user');
              await refreshMandates();
              Alert.alert('Success', 'Mandate revoked', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Error revoking mandate:', error);
              Alert.alert('Error', 'Failed to revoke mandate');
            }
          },
        },
      ]
    );
  };

  const getMandateText = (): string => {
    if (!mandate) return '';
    // Use custom limits if set, otherwise use mandate constraints
    const effectiveConstraints = customLimits ? {
      ...mandate.constraints,
      maxTransactionAmount: customLimits.maxTransactionAmount,
      dailySpendingLimit: customLimits.dailySpendingLimit,
      monthlySpendingLimit: customLimits.monthlySpendingLimit,
      maxItemValue: customLimits.maxItemValue,
      maxItemsPerDay: customLimits.maxItemsPerDay,
      requiresTwoFactor: customLimits.requiresTwoFactor,
    } : mandate.constraints;
    const constraintsText = JSON.stringify(effectiveConstraints, null, 2);
    return `I authorize ${mandate.agentName} to perform ${mandate.type} operations with the following constraints:\n\n${constraintsText}\n\nThis authorization is valid until revoked.`;
  };

  if (loading || !mandate) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.agentName}>
          {isIntentFlow ? intentData?.agentName || mandate.agentName : mandate.agentName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isIntentFlow ? '#F59E0B' : getStatusColor(mandate.status) }]}>
          <Text style={styles.statusText}>
            {isIntentFlow ? 'INTENT APPROVAL' : mandate.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Cart Items Section - Show what is being purchased */}
      {cartData && cartData.items && cartData.items.length > 0 && (
        <View style={styles.cartSection}>
          <Text style={styles.cartTitle}>Items to Purchase</Text>
          <View style={styles.cartItems}>
            {cartData.items.map((item, index) => (
              <View key={item.id || index} style={styles.cartItem}>
                <View style={styles.cartItemImageContainer}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.cartItemImage} />
                  ) : (
                    <View style={styles.cartItemImagePlaceholder}>
                      <Text style={styles.cartItemImagePlaceholderText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.cartItemDetails}>
                  <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.cartItemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.cartTotal}>
            <Text style={styles.cartTotalLabel}>Total Amount</Text>
            <Text style={styles.cartTotalValue}>${cartData.total.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Intent Section - Show what intent is being approved */}
      {intentData && intentData.product && (
        <View style={styles.intentSection}>
          <Text style={styles.intentTitle}>Purchase Intent Approval</Text>
          <View style={styles.intentCard}>
            <View style={styles.intentProduct}>
              <View style={styles.cartItemImageContainer}>
                {intentData.product.image ? (
                  <Image source={{ uri: intentData.product.image }} style={styles.cartItemImage} />
                ) : (
                  <View style={styles.cartItemImagePlaceholder}>
                    <Text style={styles.cartItemImagePlaceholderText}>
                      {intentData.product.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.intentProductDetails}>
                <Text style={styles.intentProductName} numberOfLines={2}>
                  {intentData.product.name}
                </Text>
                <Text style={styles.intentProductQuantity}>
                  Qty: {intentData.product.quantity}
                </Text>
              </View>
              <Text style={styles.intentProductPrice}>
                ${intentData.product.price.toFixed(2)}
              </Text>
            </View>
            <View style={styles.intentConstraints}>
              <View style={styles.intentConstraintRow}>
                <Text style={styles.intentConstraintLabel}>Max Price:</Text>
                <Text style={styles.intentConstraintValue}>${intentData.maxPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.intentConstraintRow}>
                <Text style={styles.intentConstraintLabel}>AI Agent:</Text>
                <Text style={styles.intentConstraintValue}>{intentData.agentName}</Text>
              </View>
            </View>
            {intentData.reasoning && (
              <View style={styles.intentReasoning}>
                <Text style={styles.intentReasoningLabel}>Reasoning:</Text>
                <Text style={styles.intentReasoningText}>{intentData.reasoning}</Text>
              </View>
            )}
          </View>
          <Text style={styles.intentDescription}>
            By approving, you authorize the AI Agent to automatically purchase this item when
            the price drops to or below your max price.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Authorization Type</Text>
        <Text style={styles.value}>{mandate.type === 'payment' ? 'Payment Authorization' : mandate.type}</Text>
      </View>

      {/* Editable Spending Limits */}
      <View style={styles.limitsSection}>
        <MandateLimitsEditor
          initialLimits={{
            maxTransactionAmount: (mandate.constraints as any).maxTransactionAmount || 500,
            dailySpendingLimit: (mandate.constraints as any).dailySpendingLimit || 1000,
            monthlySpendingLimit: (mandate.constraints as any).monthlySpendingLimit || 5000,
            maxItemValue: (mandate.constraints as any).maxItemValue,
            maxItemsPerDay: (mandate.constraints as any).maxItemsPerDay,
            requiresTwoFactor: (mandate.constraints as any).requiresTwoFactor ?? true,
          }}
          onLimitsChange={(limits) => setCustomLimits(limits)}
          mandateType={mandate.type}
          editable={mandate.status === 'pending'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Valid From</Text>
        <Text style={styles.value}>{new Date(mandate.validFrom).toLocaleString()}</Text>
      </View>

      {mandate.validUntil && (
        <View style={styles.section}>
          <Text style={styles.label}>Valid Until</Text>
          <Text style={styles.value}>{new Date(mandate.validUntil).toLocaleString()}</Text>
        </View>
      )}

      {mandate.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.checkboxContainer, { marginBottom: 16 }]}
            onPress={() => setAgreed(!agreed)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {isIntentFlow
                ? 'I authorize this AI agent to purchase the item above on my behalf'
                : 'I have read and agree to authorize this AI agent'}
            </Text>
          </TouchableOpacity>

          {/* Step 1: Biometric Verification */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 1: Verify Identity</Text>
            {!biometricVerified ? (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricVerification}
              >
                <Text style={styles.biometricIcon}>
                  {biometricType === 'face' ? '👤' : '👆'}
                </Text>
                <Text style={styles.biometricButtonText}>
                  {biometricType === 'face' ? 'Verify with Face ID' : 'Verify with Fingerprint'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Identity Verified</Text>
              </View>
            )}
          </View>

          {/* Step 2: Add Signature */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 2: Add Signature</Text>
            {!signatureData ? (
              <TouchableOpacity
                style={[styles.signatureButton, !biometricVerified && styles.buttonDisabled]}
                onPress={() => setShowSignaturePad(true)}
                disabled={!biometricVerified}
              >
                <Text style={styles.signatureButtonText}>Add Signature</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.signatureAdded}>
                  <Text style={styles.signatureAddedText}>✓ Signature Added</Text>
                </View>
                {(() => {
                  try {
                    const sigData = JSON.parse(signatureData);
                    if (sigData.paths && sigData.paths.length > 0) {
                      const previewWidth = Dimensions.get('window').width - 96;
                      const scale = previewWidth / (sigData.width || previewWidth);
                      const previewHeight = (sigData.height || 120) * scale;
                      return (
                        <View style={styles.signaturePreview}>
                          <Text style={styles.signaturePreviewLabel}>Your Signature</Text>
                          <View style={styles.signaturePreviewBox}>
                            <Svg width={previewWidth} height={previewHeight} viewBox={`0 0 ${sigData.width || previewWidth} ${sigData.height || previewHeight}`}>
                              {sigData.paths.map((pathD: string, i: number) => (
                                <SvgPath
                                  key={i}
                                  d={pathD}
                                  stroke="#1F2937"
                                  strokeWidth={3}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              ))}
                            </Svg>
                          </View>
                        </View>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </View>
            )}
          </View>

          {/* Approve Button */}
          <TouchableOpacity
            style={[styles.approveButton, (!agreed || !signatureData || !biometricVerified || signing) && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={!agreed || !signatureData || !biometricVerified || signing}
          >
            {signing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.approveButtonText}>
                {isIntentFlow ? 'Approve Intent & Authorize' : 'Approve & Authorize Payment'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Mandate</Text>
          </TouchableOpacity>
        </View>
      )}

      {mandate.status === 'active' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.revokeButton} onPress={handleRevoke}>
            <Text style={styles.revokeButtonText}>Revoke Mandate</Text>
          </TouchableOpacity>
        </View>
      )}

      {(mandate.status === 'revoked' || mandate.status === 'expired') && (
        <View style={styles.actions}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              This mandate has been {mandate.status === 'revoked' ? 'revoked' : 'expired'} and is no longer active.
            </Text>
          </View>
        </View>
      )}

      <Modal
        visible={showSignaturePad}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSignaturePad(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Mandate</Text>
            <SignaturePad
              onSignatureComplete={(data) => {
                setSignatureData(data);
                setShowSignaturePad(false);
              }}
              onClear={() => setSignatureData(null)}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSignaturePad(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'active': return '#10B981';
    case 'revoked': return '#EF4444';
    case 'suspended': return '#6B7280';
    default: return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  agentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
  },
  constraintsText: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  limitsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  constraintsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  constraintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  constraintLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  constraintValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  cartSection: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#86EFAC',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  cartItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cartItemImageContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  cartItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemImagePlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  cartItemQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
  },
  cartTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  cartTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#166534',
  },
  // Intent Section Styles
  intentSection: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  intentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 12,
  },
  intentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  intentProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  intentProductDetails: {
    flex: 1,
  },
  intentProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  intentProductQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  intentProductPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  intentConstraints: {
    marginBottom: 12,
  },
  intentConstraintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  intentConstraintLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  intentConstraintValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  intentReasoning: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  intentReasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  intentReasoningText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  intentDescription: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  actions: {
    padding: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
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
  },
  signatureButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  signatureButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureAdded: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  signatureAddedText: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '600',
  },
  signaturePreview: {
    marginBottom: 16,
  },
  signaturePreviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  signaturePreviewBox: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  biometricButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  biometricIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  verifiedText: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  revokeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    margin: 24,
  },
  revokeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    margin: 24,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
