import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENT_METHODS_KEY = 'payment_methods';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay';
  label: string;
  last4?: string;
  cardholderName?: string;
  expiry?: string;
  email?: string;
  isDefault: boolean;
  createdAt: string;
}

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function getCardBrand(num: string): string {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  return 'Card';
}

export const PaymentMethodsScreen: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Wallet form
  const [paypalEmail, setPaypalEmail] = useState('');

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const data = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
      setMethods(data ? JSON.parse(data) : []);
    } catch {
      setMethods([]);
    }
  };

  const saveMethods = async (updated: PaymentMethod[]) => {
    await AsyncStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(updated));
    setMethods(updated);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMethods();
    setRefreshing(false);
  }, []);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  const handleAddCard = async () => {
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (!cleanNumber || cleanNumber.length < 13) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return;
    }
    if (!luhnCheck(cleanNumber)) {
      Alert.alert('Invalid Card', 'Card number failed validation. Please check and try again.');
      return;
    }
    if (!cardholderName.trim()) {
      Alert.alert('Required', 'Please enter the cardholder name');
      return;
    }
    if (!expiry || expiry.length < 5) {
      Alert.alert('Required', 'Please enter a valid expiry date (MM/YY)');
      return;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert('Required', 'Please enter a valid CVV');
      return;
    }

    const brand = getCardBrand(cleanNumber);
    const last4 = cleanNumber.slice(-4);
    const newMethod: PaymentMethod = {
      id: `card_${Date.now()}`,
      type: 'card',
      label: `${brand} ****${last4}`,
      last4,
      cardholderName: cardholderName.trim(),
      expiry,
      isDefault: methods.length === 0,
      createdAt: new Date().toISOString(),
    };

    await saveMethods([...methods, newMethod]);
    setCardNumber('');
    setCardholderName('');
    setExpiry('');
    setCvv('');
    setShowAddCard(false);
    Alert.alert('Success', `${brand} card ending in ${last4} added`);
  };

  const handleAddPayPal = async () => {
    if (!paypalEmail.trim() || !paypalEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid PayPal email');
      return;
    }

    const newMethod: PaymentMethod = {
      id: `paypal_${Date.now()}`,
      type: 'paypal',
      label: `PayPal (${paypalEmail.trim()})`,
      email: paypalEmail.trim(),
      isDefault: methods.length === 0,
      createdAt: new Date().toISOString(),
    };

    await saveMethods([...methods, newMethod]);
    setPaypalEmail('');
    setShowAddWallet(false);
    Alert.alert('Success', 'PayPal account linked');
  };

  const handleAddApplePay = async () => {
    const newMethod: PaymentMethod = {
      id: `apple_pay_${Date.now()}`,
      type: 'apple_pay',
      label: 'Apple Pay',
      isDefault: methods.length === 0,
      createdAt: new Date().toISOString(),
    };

    await saveMethods([...methods, newMethod]);
    setShowAddWallet(false);
    Alert.alert('Success', 'Apple Pay added (simulated)');
  };

  const handleSetDefault = async (id: string) => {
    const updated = methods.map(m => ({
      ...m,
      isDefault: m.id === id,
    }));
    await saveMethods(updated);
  };

  const handleDelete = (id: string) => {
    const method = methods.find(m => m.id === id);
    Alert.alert(
      'Remove Payment Method',
      `Remove ${method?.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            let updated = methods.filter(m => m.id !== id);
            if (method?.isDefault && updated.length > 0) {
              updated[0].isDefault = true;
            }
            await saveMethods(updated);
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'card': return '💳';
      case 'paypal': return '🅿️';
      case 'apple_pay': return '🍎';
      default: return '💰';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Saved Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
        {methods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>No payment methods saved</Text>
            <Text style={styles.emptySubtext}>Add a card or wallet to get started</Text>
          </View>
        ) : (
          methods.map((method) => (
            <View key={method.id} style={styles.methodCard}>
              <View style={styles.methodRow}>
                <Text style={styles.methodIcon}>{getTypeIcon(method.type)}</Text>
                <View style={styles.methodDetails}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  {method.expiry && (
                    <Text style={styles.methodExpiry}>Exp: {method.expiry}</Text>
                  )}
                  {method.cardholderName && (
                    <Text style={styles.methodCardholderName}>{method.cardholderName}</Text>
                  )}
                </View>
                <View style={styles.methodActions}>
                  {method.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Text style={styles.setDefaultText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(method.id)}>
                    <Text style={styles.deleteText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Add Card */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setShowAddCard(!showAddCard); setShowAddWallet(false); }}
        >
          <Text style={styles.addButtonIcon}>💳</Text>
          <Text style={styles.addButtonText}>Add Card</Text>
          <Text style={styles.addButtonChevron}>{showAddCard ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAddCard && (
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={cardholderName}
                onChangeText={setCardholderName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.inputLabel}>Expiry</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={expiry}
                  onChangeText={(t) => setExpiry(formatExpiry(t))}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleAddCard}>
              <Text style={styles.submitButtonText}>Add Card</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Wallet */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setShowAddWallet(!showAddWallet); setShowAddCard(false); }}
        >
          <Text style={styles.addButtonIcon}>📱</Text>
          <Text style={styles.addButtonText}>Add Wallet</Text>
          <Text style={styles.addButtonChevron}>{showAddWallet ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAddWallet && (
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PayPal Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={paypalEmail}
                onChangeText={setPaypalEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleAddPayPal}>
                <Text style={styles.submitButtonText}>Link PayPal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.walletOption} onPress={handleAddApplePay}>
              <Text style={styles.walletOptionIcon}>🍎</Text>
              <View style={styles.walletOptionText}>
                <Text style={styles.walletOptionTitle}>Apple Pay</Text>
                <Text style={styles.walletOptionSubtitle}>Add simulated Apple Pay</Text>
              </View>
              <Text style={styles.walletOptionChevron}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  methodExpiry: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  methodCardholderName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  methodActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  setDefaultButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  setDefaultText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  deleteText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  addButtonChevron: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputRow: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  walletOptionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  walletOptionText: {
    flex: 1,
  },
  walletOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  walletOptionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  walletOptionChevron: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: '600',
  },
});
