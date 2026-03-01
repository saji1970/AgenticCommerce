import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../../contexts/CartContext';
import { paymentService } from '../../services/payment.service';
import { PaymentMethod } from '@agentic-commerce/shared-types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CartStackParamList } from '../../types/navigation';
import { AppConfig } from '../../config/app.config';
import { storageService } from '../../services/storage.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paymentGatewayClient } from '../../services/payment-gateway.client';
import { cartService, isCartDemoMode } from '../../services/cart.service';

const VRP_CONSENT_TOKENS_KEY = 'vrp_consent_tokens';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<CartStackParamList, 'Checkout'>;

interface Props {
  navigation: CheckoutScreenNavigationProp;
}

export const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [checkingMandate, setCheckingMandate] = useState(true);
  const [consentToken, setConsentToken] = useState<string | null>(null);
  const [mandateReady, setMandateReady] = useState(false);

  const defaultAgent = AppConfig.getDefaultAgent();

  useFocusEffect(
    useCallback(() => {
      checkPaymentMandate();
    }, [])
  );

  const checkPaymentMandate = async () => {
    try {
      setCheckingMandate(true);
      const user = await storageService.getUser();
      if (!user?.id) {
        setMandateReady(false);
        setConsentToken(null);
        setCheckingMandate(false);
        Alert.alert('Login Required', 'Please log in to checkout.');
        return;
      }

      const [consents, tokensJson] = await Promise.all([
        paymentGatewayClient.getUserConsents(user.id, 'active'),
        AsyncStorage.getItem(VRP_CONSENT_TOKENS_KEY),
      ]);

      const tokens: Record<string, string> = tokensJson ? JSON.parse(tokensJson) : {};
      const agentConsent = consents.find(
        (c) => c.agentId === defaultAgent.id && (c.status === 'active' || c.status === 'pending')
      );

      if (agentConsent) {
        const token = typeof tokens[agentConsent.id] === 'string'
          ? tokens[agentConsent.id]
          : (tokens[agentConsent.id] as any)?.token;
        if (token) {
          setConsentToken(token);
          setMandateReady(true);
        } else {
          setConsentToken(null);
          setMandateReady(false);
        }
      } else {
        setConsentToken(null);
        setMandateReady(false);
      }
    } catch (err) {
      console.error('Check payment mandate:', err);
      setConsentToken(null);
      setMandateReady(false);
    } finally {
      setCheckingMandate(false);
    }
  };

  const handlePayment = async () => {
    if (!cart || !consentToken) {
      Alert.alert('Error', 'Payment mandate not found. Create one in Profile > Checkout Payment Mandate.');
      return;
    }

    try {
      setLoading(true);

      // When DEMO_MODE, sync local cart to backend before payment
      if (isCartDemoMode()) {
        await cartService.syncDemoCartToBackend();
      }

      const result = await paymentService.processPayment(
        {
          cartId: cart.id,
          paymentMethod: 'vrp_mandate' as PaymentMethod,
          vrpConsentToken: consentToken,
        },
        defaultAgent.id,
        true,
        cart.total,
        undefined,
        undefined
      );

      const txnId = result?.payment?.transactionId ?? 'N/A';
      Alert.alert(
        'Payment Successful!',
        `Your order has been confirmed. Transaction ID: ${txnId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              try {
                clearCart();
                navigation.navigate('OrderHistory');
              } catch (navErr) {
                console.error('Post-payment navigation error:', navErr);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Payment error:', err);
      const errData = err?.response?.data?.error;
      const msg =
        typeof errData === 'string'
          ? errData
          : typeof errData?.message === 'string'
            ? errData.message
            : err?.message || 'Failed to process payment.';
      Alert.alert('Payment Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!cart) {
    return (
      <View style={styles.centered}>
        <Text>Cart is empty</Text>
      </View>
    );
  }

  if (checkingMandate) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking payment mandate...</Text>
      </View>
    );
  }

  if (!mandateReady || !consentToken) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>${cart.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>${cart.tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${cart.total.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.mandateRequired}>
          <Text style={styles.mandateRequiredTitle}>Payment Mandate Required</Text>
          <Text style={styles.mandateRequiredText}>
            Create a Checkout Payment Mandate in Profile to pay with your saved payment method. No need to enter card details at checkout.
          </Text>
          <TouchableOpacity
            style={styles.createMandateButton}
            onPress={() => {
              const root = navigation.getParent()?.getParent();
              (root as any)?.navigate?.('Profile', { screen: 'PaymentMandates' });
            }}
          >
            <Text style={styles.createMandateButtonText}>Go to Profile → Checkout Payment Mandate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.recheckButton} onPress={checkPaymentMandate}>
            <Text style={styles.recheckButtonText}>Re-check after creating</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>${cart.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax:</Text>
          <Text style={styles.summaryValue}>${cart.tax.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${cart.total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.paymentMethodInfo}>
        <Text style={styles.paymentMethodInfoText}>Paying with your Checkout Payment Mandate</Text>
      </View>

      <TouchableOpacity
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>Pay ${cart.total.toFixed(2)}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  paymentMethodInfo: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  paymentMethodInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
  },
  mandateRequired: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  mandateRequiredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  mandateRequiredText: {
    fontSize: 14,
    color: '#BF360C',
    marginBottom: 16,
    lineHeight: 20,
  },
  createMandateButton: {
    backgroundColor: '#E65100',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createMandateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recheckButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  recheckButtonText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#999',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
