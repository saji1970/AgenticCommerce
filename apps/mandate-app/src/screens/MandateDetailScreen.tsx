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
import signatureService, { MandateSignature } from '../services/signature.service';
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
  intentType?: string;
  targetPrice?: number;
  scheduledDate?: string;
  customReasoning?: string;
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
  const [storedSignature, setStoredSignature] = useState<MandateSignature | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('fingerprint');
  const [cartData, setCartData] = useState<CartData | null>(routeCartData || null);
  const [intentData, setIntentData] = useState<IntentData | null>(routeIntentData || null);
  const [customLimits, setCustomLimits] = useState<MandateLimits | null>(null);

  // Determine if this is an intent approval flow
  const isIntentFlow = !!intentData;

  useEffect(() => {
    // Reset approval state when mandateId changes - each mandate requires fresh biometric + signature
    setBiometricVerified(false);
    setSignatureData(null);
    setStoredSignature(null);
    setAgreed(false);
    setShowSignaturePad(false);
    setCustomLimits(null);

    loadMandate();
    checkBiometricType();
    // Always sync cart/intent data from route params - clear when not passed to avoid showing wrong product
    setCartData(routeCartData || null);
    setIntentData(routeIntentData || null);
    if (routeIntentData) {
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

      // Load stored signature for display (evidence for active mandates)
      try {
        const sig = await signatureService.getSignatureByMandate(mandateId);
        setStoredSignature(sig);
      } catch {
        setStoredSignature(null);
      }

      // If no cart/intent data from route params, try to extract from mandate constraints
      const c = mandateData.constraints as Record<string, any>;
      if (!routeCartData && !routeIntentData && c?.productName) {
        if (mandateData.type === 'cart') {
          setCartData({
            items: [{
              id: c.productId || mandateId,
              name: c.productName,
              price: c.productPrice || 0,
              quantity: 1,
              imageUrl: c.productImage,
            }],
            total: c.productPrice || 0,
            agentName: mandateData.agentName,
          });
        } else if (mandateData.type === 'intent') {
          setIntentData({
            type: 'intent',
            product: {
              id: c.productId || mandateId,
              name: c.productName,
              image: c.productImage,
              price: c.productPrice || 0,
              quantity: 1,
            },
            maxPrice: c.maxIntentValue || c.productPrice || 0,
            reasoning: c.reasoning,
            agentName: mandateData.agentName,
            intentType: c.intentType,
            targetPrice: c.targetPrice,
            scheduledDate: c.scheduledDate,
          });
        }
      }
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
      if (customLimits && mandate) {
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

      // Send deep link back to AgenticCommerce app (include mandate token and cart data for cart mandates)
      const tokenParam = mandateToken ? `&mandateToken=${encodeURIComponent(mandateToken)}` : '';
      // Use type-specific callback path
      const callbackPath = mandate?.type === 'app' ? 'app-callback'
        : mandate?.type === 'cart' ? 'cart-callback' : 'payment-callback';
      let callbackUrl = isIntentFlow
        ? `${AGENTIC_COMMERCE_SCHEME}intent-callback?mandateId=${mandateId}&status=approved${intentId ? `&intentId=${intentId}` : ''}${tokenParam}`
        : `${AGENTIC_COMMERCE_SCHEME}${callbackPath}?mandateId=${mandateId}&status=approved${tokenParam}`;

      // Include cartData in callback URL so shopping app can add product even if AsyncStorage was cleared
      if (mandate?.type === 'cart' && cartData?.items?.length) {
        const item = cartData.items[0];
        const cartDataParam = encodeURIComponent(JSON.stringify({
          productId: item.id,
          productName: item.name,
          productImage: item.imageUrl,
          quantity: item.quantity || 1,
          price: item.price,
        }));
        callbackUrl += `&cartData=${cartDataParam}`;
      }

      const isAppMandate = mandate?.type === 'app';
      const alertTitle = isIntentFlow ? 'Intent Approved!' : isAppMandate ? 'AI Agent Registered!' : 'Mandate Approved!';
      const alertMessage = isIntentFlow
        ? `Your purchase intent has been approved!\n\nThe AI Agent will now be able to purchase "${intentData?.product.name}" for you when conditions are met.`
        : isAppMandate
        ? 'Your AI agent has been registered with your purchase limits and payment methods.\n\nYou can now make purchases through this agent.'
        : 'Your authorization has been recorded with biometric verification and signature.\n\nThe AI Agent is now authorized to complete your purchase.';

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'Return to Shopping',
            onPress: async () => {
              try {
                console.log('[MandateDetail] Opening callback URL:', callbackUrl);
                await Linking.openURL(callbackUrl);
              } catch (linkError) {
                console.error('[MandateDetail] Error opening deep link:', linkError);
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
              const user = await storageService.getUser();
              const revokeUserId = mandate!.userId || user?.id;
              if (!revokeUserId) {
                Alert.alert('Error', 'User not logged in. Cannot cancel mandate.');
                return;
              }
              await mandateServiceClient.revokeMandate(mandateId, revokeUserId, 'Cancelled by user');
              await refreshMandates();
              Alert.alert('Success', 'Mandate cancelled', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              console.error('Error cancelling mandate:', error);
              const msg = error?.response?.data?.error || error?.message || 'Failed to cancel mandate';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  /**
   * When mandate is already active and we have cartData/intentData from Shopping app,
   * user can confirm this purchase and return - opens callback so Shopping app adds to cart.
   */
  const handleConfirmAndReturn = async () => {
    if (!mandate) return;
    const callbackPath = mandate.type === 'app' ? 'app-callback'
      : mandate.type === 'cart' ? 'cart-callback' : 'payment-callback';
    let callbackUrl = mandate.type === 'intent' || isIntentFlow
      ? `${AGENTIC_COMMERCE_SCHEME}intent-callback?mandateId=${mandateId}&status=approved`
      : `${AGENTIC_COMMERCE_SCHEME}${callbackPath}?mandateId=${mandateId}&status=approved`;

    if (mandate.type === 'cart' && cartData?.items?.length) {
      const item = cartData.items[0];
      const cartDataParam = encodeURIComponent(JSON.stringify({
        productId: item.id,
        productName: item.name,
        productImage: item.imageUrl,
        quantity: item.quantity || 1,
        price: item.price,
      }));
      callbackUrl += `&cartData=${cartDataParam}`;
    }

    // Revoke intent mandate after confirmation so it disappears from active list
    if (mandate.type === 'intent' || isIntentFlow) {
      try {
        const user = await storageService.getUser();
        const revokeUserId = mandate.userId || user?.id;
        if (revokeUserId) {
          await mandateServiceClient.revokeMandate(mandateId, revokeUserId, 'Intent fulfilled - confirmed by user');
          await refreshMandates();
          console.log('[MandateDetail] Intent mandate revoked after confirmation');
        }
      } catch (revokeError) {
        console.warn('[MandateDetail] Failed to revoke intent mandate:', revokeError);
        // Continue with callback even if revoke fails
      }
    }

    try {
      await Linking.openURL(callbackUrl);
    } catch (e) {
      console.error('[MandateDetail] Error opening callback:', e);
      navigation.goBack();
    }
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
              const user = await storageService.getUser();
              const revokeUserId = mandate!.userId || user?.id;
              if (!revokeUserId) {
                Alert.alert('Error', 'User not logged in. Cannot revoke mandate.');
                return;
              }
              await mandateServiceClient.revokeMandate(mandateId, revokeUserId, 'Revoked by user');
              await refreshMandates();
              Alert.alert('Success', 'Mandate revoked', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              console.error('Error revoking mandate:', error);
              const msg = error?.response?.data?.error || error?.message || 'Failed to revoke mandate';
              Alert.alert('Error', msg);
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

  // Use in-memory signature (current session) or stored signature from DB for display
  const effectiveSignatureData = signatureData || storedSignature?.signatureImageUrl || null;

  /** Parse signature for display: supports JSON paths or data URL */
  const renderSignaturePreview = (data: string | null | undefined, showChangeButton = true) => {
    if (!data || typeof data !== 'string') return null;
    const trimmed = data.trim();
    if (!trimmed) return null;
    // Data URL (base64 image) - render with Image
    if (trimmed.startsWith('data:image') || trimmed.startsWith('data:application')) {
      return (
        <View style={styles.signaturePreview}>
          <Text style={styles.signaturePreviewLabel}>Your Signature</Text>
          <View style={styles.signaturePreviewBox}>
            <Image source={{ uri: trimmed }} style={styles.signatureImage} resizeMode="contain" />
            {showChangeButton && (
              <TouchableOpacity style={styles.signatureChangeButton} onPress={() => setShowSignaturePad(true)}>
                <Text style={styles.signatureChangeText}>Change signature</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
    // JSON with SVG paths
    let sigData: { paths?: string[]; width?: number; height?: number } | null = null;
    try {
      sigData = JSON.parse(trimmed);
      if (typeof sigData === 'string') sigData = JSON.parse(sigData);
    } catch {
      return null;
    }
    const paths = sigData?.paths;
    if (Array.isArray(paths) && paths.some((p) => p && String(p).trim().length > 0)) {
      const previewWidth = Dimensions.get('window').width - 96;
      const sigWidth = sigData?.width || previewWidth;
      const sigHeight = sigData?.height || 120;
      const scale = Math.min(previewWidth / sigWidth, 120 / sigHeight);
      const previewHeight = Math.min(sigHeight * scale, 120);
      return (
        <View style={styles.signaturePreview}>
          <Text style={styles.signaturePreviewLabel}>Your Signature</Text>
          <View style={styles.signaturePreviewBox}>
            <Svg width={previewWidth} height={previewHeight} viewBox={`0 0 ${sigWidth} ${sigHeight}`} preserveAspectRatio="xMidYMid meet">
              {paths
                .filter((p) => p && String(p).trim().length > 0)
                .map((pathD: string, i: number) => (
                  <SvgPath key={i} d={pathD} stroke="#1F2937" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
            </Svg>
            {showChangeButton && (
              <TouchableOpacity style={styles.signatureChangeButton} onPress={() => setShowSignaturePad(true)}>
                <Text style={styles.signatureChangeText}>Change signature</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
    return null;
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
      {/* Prominent product banner when adding new item to cart - always visible at top */}
      {cartData && cartData.items && cartData.items.length > 0 && mandate?.type === 'cart' && (
        <View style={styles.currentProductBanner}>
          <Text style={styles.currentProductBannerLabel}>Adding to cart</Text>
          <Text style={styles.currentProductBannerProduct} numberOfLines={2}>
            {cartData.items.map(i => i.name).join(', ')}
          </Text>
          <Text style={styles.currentProductBannerPrice}>
            ${cartData.total.toFixed(2)} total
          </Text>
        </View>
      )}

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
            {/* Intent Conditions Summary */}
            {intentData.intentType && (
              <View style={styles.intentConditionsSummary}>
                <Text style={styles.intentConditionsSummaryLabel}>Intent Condition:</Text>
                <Text style={styles.intentConditionsSummaryText}>
                  {intentData.intentType === 'price_drop'
                    ? `Buy when price drops to $${intentData.targetPrice?.toFixed(2) || intentData.maxPrice.toFixed(2)}`
                    : intentData.intentType === 'availability'
                    ? 'Notify when back in stock'
                    : intentData.intentType === 'time_based'
                    ? `Scheduled purchase on ${intentData.scheduledDate ? new Date(intentData.scheduledDate).toLocaleDateString() : 'TBD'}`
                    : intentData.customReasoning || intentData.reasoning || 'General purchase intent'}
                </Text>
              </View>
            )}
            {intentData.reasoning && (
              <View style={styles.intentReasoning}>
                <Text style={styles.intentReasoningLabel}>Reasoning:</Text>
                <Text style={styles.intentReasoningText}>{intentData.reasoning}</Text>
              </View>
            )}
          </View>
          <Text style={styles.intentDescription}>
            {intentData.intentType === 'price_drop'
              ? `By approving, you authorize the AI Agent to automatically purchase this item when the price drops to $${intentData.targetPrice?.toFixed(2) || intentData.maxPrice.toFixed(2)} or below.`
              : intentData.intentType === 'availability'
              ? 'By approving, you authorize the AI Agent to notify you and purchase this item when it becomes available.'
              : intentData.intentType === 'time_based'
              ? `By approving, you authorize the AI Agent to purchase this item on ${intentData.scheduledDate ? new Date(intentData.scheduledDate).toLocaleDateString() : 'the scheduled date'}.`
              : 'By approving, you authorize the AI Agent to automatically purchase this item when conditions are met.'}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Authorization Type</Text>
        <Text style={styles.value}>
          {mandate.type === 'app' ? 'AI Agent Registration (Master)'
            : mandate.type === 'payment' ? 'Payment Authorization'
            : mandate.type.charAt(0).toUpperCase() + mandate.type.slice(1)}
        </Text>
      </View>

      {/* App Mandate: Payment Methods */}
      {mandate.type === 'app' && mandate.paymentMethods && mandate.paymentMethods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Payment Methods</Text>
          {mandate.paymentMethods.map((pm: any, idx: number) => (
            <View key={pm.id || idx} style={styles.constraintRow}>
              <Text style={styles.constraintLabel}>
                {pm.type === 'card' ? 'Card' : pm.type === 'paypal' ? 'PayPal' : pm.type}
                {pm.last4 ? ` ****${pm.last4}` : ''}
                {pm.email ? ` (${pm.email})` : ''}
              </Text>
              <Text style={styles.constraintValue}>{pm.isDefault ? 'Default' : ''}</Text>
            </View>
          ))}
        </View>
      )}

      {/* App Mandate: Show parent info on child mandates */}
      {mandate.parentMandateId && mandate.type !== 'app' && (
        <View style={styles.section}>
          <Text style={styles.label}>Parent App Mandate</Text>
          <Text style={styles.value}>{mandate.parentMandateId}</Text>
        </View>
      )}

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
            {!effectiveSignatureData ? (
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
                {renderSignaturePreview(effectiveSignatureData) ?? (
                  <View style={styles.signaturePreview}>
                    <Text style={styles.signaturePreviewLabel}>Your Signature</Text>
                    <View style={[styles.signaturePreviewBox, styles.signatureCapturedFallback]}>
                      <Text style={styles.signatureCapturedText}>✓ Signature captured</Text>
                      <TouchableOpacity onPress={() => setShowSignaturePad(true)}>
                        <Text style={styles.signatureChangeText}>Change signature</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
          {/* Show stored signature as evidence for active mandates */}
          {effectiveSignatureData && (
            <View style={[styles.stepContainer, { marginBottom: 20 }]}>
              <Text style={styles.stepTitle}>Your Signature (signed evidence)</Text>
              {renderSignaturePreview(effectiveSignatureData, false) ?? (
                <View style={styles.signaturePreview}>
                  <View style={[styles.signaturePreviewBox, styles.signatureCapturedFallback]}>
                    <Text style={styles.signatureCapturedText}>✓ Signature on file</Text>
                  </View>
                </View>
              )}
            </View>
          )}
          {/* When opened from Shopping app with cart/intent data, show Confirm button */}
          {(cartData?.items?.length || intentData) && (
            <TouchableOpacity
              style={styles.approveButton}
              onPress={handleConfirmAndReturn}
            >
              <Text style={styles.approveButtonText}>
                {intentData ? 'Confirm Intent & Return' : 'Confirm & Return to Shopping'}
              </Text>
            </TouchableOpacity>
          )}
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
  currentProductBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  currentProductBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentProductBannerProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  currentProductBannerPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
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
  intentConditionsSummary: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  intentConditionsSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intentConditionsSummaryText: {
    fontSize: 15,
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
    minHeight: 80,
  },
  signatureImage: {
    width: '100%',
    height: 120,
    minHeight: 80,
  },
  signatureCapturedFallback: {
    justifyContent: 'center',
  },
  signatureCapturedText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '600',
    marginBottom: 4,
  },
  signatureChangeText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  signatureChangeButton: {
    marginTop: 8,
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
