import React, { useState } from 'react';
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
import { useCart } from '../../contexts/CartContext';
import { paymentService } from '../../services/payment.service';
import { PaymentMethod } from '@agentic-commerce/shared-types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CartStackParamList } from '../../navigation/types';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<CartStackParamList, 'Checkout'>;

interface Props {
  navigation: CheckoutScreenNavigationProp;
}

export const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD);

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  // PayPal details
  const [paypalEmail, setPaypalEmail] = useState('');

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

      const result = await paymentService.processPayment(paymentRequest);

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
              secureTextEntry
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
});
