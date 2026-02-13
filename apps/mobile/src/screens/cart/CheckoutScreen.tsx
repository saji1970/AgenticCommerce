import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { CartStackParamList } from '../../navigation/types';
import { checkPaymentMandate, registerPaymentMandate } from '../../utils/mandateCheck';
import { AppConfig } from '../../config/app.config';
import { storageService } from '../../services/storage.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_PAYMENT_KEY = 'pending_payment_request';
const MANDATE_TOKEN_KEY = 'mandate_token';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<CartStackParamList, 'Checkout'>;

interface Props {
  navigation: CheckoutScreenNavigationProp;
}

export const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [mandateCheckComplete, setMandateCheckComplete] = useState(false);

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  // PayPal details
  const [paypalEmail, setPaypalEmail] = useState('');

  // Check for mandate on mount and when screen comes into focus (after returning from Mandate app)
  useFocusEffect(
    useCallback(() => {
      checkMandateBeforePayment();
    }, [])
  );

  const checkMandateBeforePayment = async () => {
    try {
      // First check if user is logged in
      const user = await storageService.getUser();
      if (!user || !user.id) {
        // For demo - require login first
        Alert.alert(
          'Login Required',
          'Please login to continue with checkout.',
          [{ text: 'OK' }]
        );
        setMandateCheckComplete(false);
        return;
      }

      const defaultAgent = AppConfig.getDefaultAgent();

      let mandateCheck;
      try {
        mandateCheck = await checkPaymentMandate(defaultAgent.id, defaultAgent.name);
      } catch (mandateError) {
        console.log('Mandate check error:', mandateError);
        // Show error and keep payment disabled until mandate is approved
        setMandateCheckComplete(false);
        return;
      }

      if (!mandateCheck.hasMandate) {
        // No mandate - register and open Mandate app for approval
        const defaultConstraints = AppConfig.getDefaultConstraints('payment');

        Alert.alert(
          'AI Agent Authorization Required',
          'To complete this purchase, you need to authorize the AI Shopping Agent in the Mandate app.\n\nYou will:\n1. Verify your identity with biometrics\n2. Sign the authorization\n3. Return here to complete payment',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setMandateCheckComplete(false),
            },
            {
              text: 'Open Mandate App',
              onPress: async () => {
                try {
                  // Save pending payment info for auto-processing after mandate approval
                  if (cart) {
                    const pendingPayment = {
                      request: {
                        cartId: cart.id,
                        paymentMethod,
                        ...(paymentMethod === PaymentMethod.CARD && {
                          cardDetails: { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv },
                        }),
                        ...(paymentMethod === PaymentMethod.PAYPAL && {
                          paypalDetails: { email: paypalEmail },
                        }),
                      },
                      amount: cart.total,
                    };
                    await AsyncStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pendingPayment));
                  }

                  // Prepare cart data for mandate app to display
                  const cartDataForMandate = cart ? {
                    items: cart.items.map(item => ({
                      id: item.productId || item.id,
                      name: item.productName || 'Product',
                      price: item.price || 0,
                      quantity: item.quantity || 1,
                      imageUrl: item.productImage || item.imageUrl,
                    })),
                    total: cart.total || 0,
                    agentName: defaultAgent.name,
                  } : undefined;

                  await registerPaymentMandate(
                    defaultAgent.id,
                    defaultAgent.name,
                    defaultConstraints,
                    cartDataForMandate
                  );
                  setMandateCheckComplete(false);
                } catch (err) {
                  console.error('Error registering mandate:', err);
                  Alert.alert('Error', 'Failed to create mandate. Please try again.');
                }
              },
            },
          ]
        );
      } else {
        // Mandate exists and is active, can proceed with payment
        setMandateCheckComplete(true);
      }
    } catch (error: any) {
      console.error('Error checking mandate:', error);
      // Show error but allow retry
      Alert.alert(
        'Mandate Check Failed',
        'Unable to verify mandate status. Would you like to proceed anyway?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setMandateCheckComplete(false) },
          { text: 'Proceed', onPress: () => setMandateCheckComplete(true) },
        ]
      );
    }
  };

  const handlePayment = async () => {
    if (!cart) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    // Validation
    if (paymentMethod === PaymentMethod.CARD) {
      if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv) {
        Alert.alert('Error', 'Please fill in all card details');
        return;
      }
    } else if (paymentMethod === PaymentMethod.PAYPAL) {
      if (!paypalEmail) {
        Alert.alert('Error', 'Please enter your PayPal email');
        return;
      }
    }

    try {
      setLoading(true);

      const paymentRequest = {
        cartId: cart.id,
        paymentMethod,
        ...(paymentMethod === PaymentMethod.CARD && {
          cardDetails: {
            cardNumber,
            cardHolderName,
            expiryMonth,
            expiryYear,
            cvv,
          },
        }),
        ...(paymentMethod === PaymentMethod.PAYPAL && {
          paypalDetails: {
            email: paypalEmail,
          },
        }),
      };

      // Get default agent ID for mandate validation
      const defaultAgent = AppConfig.getDefaultAgent();

      // Retrieve stored mandate token for checkout validation
      const mandateToken = await AsyncStorage.getItem(MANDATE_TOKEN_KEY);

      const result = await paymentService.processPayment(
        paymentRequest,
        defaultAgent.id,
        false, // Don't skip mandate check
        cart.total, // Pass transaction amount for mandate validation
        mandateToken || undefined // Pass mandate token for backend validation
      );

      // Clear mandate token after successful payment
      await AsyncStorage.removeItem(MANDATE_TOKEN_KEY);

      Alert.alert(
        'Payment Successful!',
        `Your order has been confirmed. Transaction ID: ${result.payment.transactionId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              navigation.navigate('OrderHistory');
            },
          },
        ]
      );
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert(
        'Payment Failed',
        err instanceof Error ? err.message : 'Failed to process payment. Please try again.'
      );
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethodContainer}>
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              paymentMethod === PaymentMethod.CARD && styles.paymentMethodButtonActive,
            ]}
            onPress={() => setPaymentMethod(PaymentMethod.CARD)}
          >
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === PaymentMethod.CARD && styles.paymentMethodTextActive,
              ]}
            >
              Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              paymentMethod === PaymentMethod.PAYPAL && styles.paymentMethodButtonActive,
            ]}
            onPress={() => setPaymentMethod(PaymentMethod.PAYPAL)}
          >
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === PaymentMethod.PAYPAL && styles.paymentMethodTextActive,
              ]}
            >
              PayPal
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {paymentMethod === PaymentMethod.CARD && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Card Number"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            maxLength={19}
          />
          <TextInput
            style={styles.input}
            placeholder="Cardholder Name"
            value={cardHolderName}
            onChangeText={setCardHolderName}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="MM"
              value={expiryMonth}
              onChangeText={setExpiryMonth}
              keyboardType="numeric"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="YY"
              value={expiryYear}
              onChangeText={setExpiryYear}
              keyboardType="numeric"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="CVV"
              value={cvv}
              onChangeText={setCvv}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry={true}
            />
          </View>
        </View>
      )}

      {paymentMethod === PaymentMethod.PAYPAL && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PayPal Details</Text>
          <TextInput
            style={styles.input}
            placeholder="PayPal Email"
            value={paypalEmail}
            onChangeText={setPaypalEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      )}

      {!mandateCheckComplete && (
        <View style={styles.mandateWarning}>
          <Text style={styles.mandateWarningText}>
            Please approve the payment mandate in the Mandate Manager app to proceed.
          </Text>
          <TouchableOpacity
            style={styles.recheckButton}
            onPress={checkMandateBeforePayment}
          >
            <Text style={styles.recheckButtonText}>Re-check Mandate</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.payButton, (loading || !mandateCheckComplete) && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading || !mandateCheckComplete}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>Pay ${cart.total.toFixed(2)}</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.testInfo}>
        Test Card: 4532015112830366 (Valid Luhn){'\n'}
        Fail Card: Ending in 0000 (Insufficient funds)
      </Text>
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
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputSmall: {
    flex: 1,
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
  testInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    fontSize: 12,
    color: '#856404',
  },
  mandateWarning: {
    backgroundColor: '#F8D7DA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  mandateWarningText: {
    color: '#721C24',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  recheckButton: {
    backgroundColor: '#721C24',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  recheckButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
