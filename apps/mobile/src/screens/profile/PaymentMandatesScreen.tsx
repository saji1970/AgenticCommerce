import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { useMandate } from '../../contexts/MandateContext';
import { AppConfig } from '../../config/app.config';
import {
  paymentGatewayClient,
  VrpConsent,
  CreateVrpConsentRequest,
} from '../../services/payment-gateway.client';

const VRP_CONSENT_TOKENS_KEY = 'vrp_consent_tokens';
const PAYMENT_METHODS_KEY = 'payment_methods';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay';
  label: string;
  last4?: string;
  isDefault: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  revoked: { bg: '#FEE2E2', text: '#991B1B' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  suspended: { bg: '#FEF3C7', text: '#92400E' },
};

export const PaymentMandatesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { activeMandates, mandates } = useMandate();

  const [consents, setConsents] = useState<VrpConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Form state
  const [agentId, setAgentId] = useState(AppConfig.getDefaultAgent().id);
  const [agentName, setAgentName] = useState(AppConfig.getDefaultAgent().name);
  const [selectedMethodIndex, setSelectedMethodIndex] = useState(0);
  const [maxPerPayment, setMaxPerPayment] = useState('100');
  const [dailyLimit, setDailyLimit] = useState('500');
  const [monthlyLimit, setMonthlyLimit] = useState('2000');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadConsents(), loadPaymentMethods()]);
    } finally {
      setLoading(false);
    }
  };

  const loadConsents = async () => {
    if (!user?.id) return;
    try {
      const data = await paymentGatewayClient.getUserConsents(user.id);
      setConsents(data);
    } catch (err: any) {
      console.error('Failed to load consents:', err);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const data = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
      if (data) {
        setPaymentMethods(JSON.parse(data));
      }
    } catch {
      setPaymentMethods([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConsents();
    setRefreshing(false);
  }, [user?.id]);

  const findAppMandateForAgent = (aid: string): string | undefined => {
    // Look for an active APP mandate matching the agent ID
    if (activeMandates.app && (activeMandates.app as any).agentId === aid) {
      return activeMandates.app.id;
    }
    // Fallback: search all mandates
    const appMandate = mandates.find(
      (m) => m.type === 'app' && (m as any).agentId === aid && m.status === 'active'
    );
    return appMandate?.id;
  };

  const handleCreate = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    if (!agentId.trim() || !agentName.trim()) {
      Alert.alert('Required', 'Please enter Agent ID and Agent Name');
      return;
    }
    const perPayment = parseFloat(maxPerPayment);
    if (isNaN(perPayment) || perPayment <= 0) {
      Alert.alert('Invalid', 'Max per payment must be a positive number');
      return;
    }
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      Alert.alert('Invalid', 'Expiry date must be in YYYY-MM-DD format');
      return;
    }

    const selectedMethod = paymentMethods[selectedMethodIndex];
    const paymentMethod = selectedMethod
      ? { type: selectedMethod.type, label: selectedMethod.label, id: selectedMethod.id }
      : { type: 'card', label: 'Default Card' };

    const appMandateId = findAppMandateForAgent(agentId.trim());

    const request: CreateVrpConsentRequest = {
      userId: user.id,
      agentId: agentId.trim(),
      agentName: agentName.trim(),
      paymentMethod,
      maxAmountPerPayment: perPayment,
      ...(dailyLimit ? { dailyLimit: parseFloat(dailyLimit) } : {}),
      ...(monthlyLimit ? { monthlyLimit: parseFloat(monthlyLimit) } : {}),
      ...(expiryDate ? { expiryDate } : {}),
      ...(appMandateId ? { appMandateId } : {}),
    };

    try {
      setCreating(true);
      const consent = await paymentGatewayClient.createConsent(request);

      // Auto-approve
      const { consentToken } = await paymentGatewayClient.approveConsent(consent.id, user.id);

      // Store consent token
      if (consentToken) {
        const existing = await AsyncStorage.getItem(VRP_CONSENT_TOKENS_KEY);
        const tokens = existing ? JSON.parse(existing) : {};
        tokens[consent.id] = consentToken;
        await AsyncStorage.setItem(VRP_CONSENT_TOKENS_KEY, JSON.stringify(tokens));
      }

      Alert.alert('Success', 'Payment mandate created and activated');
      await loadConsents();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create payment mandate';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = (consent: VrpConsent) => {
    Alert.alert(
      'Revoke Payment Mandate',
      `Revoke mandate for "${consent.agentName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentGatewayClient.revokeConsent(consent.id, consent.userId, 'Revoked by user');
              await loadConsents();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to revoke mandate');
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.expired;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Section A: Active VRP Consents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Recurring Payment Consents</Text>
        {consents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={styles.emptyText}>No recurring payment consents</Text>
            <Text style={styles.emptySubtext}>Create a VRP consent to authorize AI agents for recurring payments</Text>
          </View>
        ) : (
          consents.map((consent) => {
            const statusStyle = getStatusStyle(consent.status);
            return (
              <View key={consent.id} style={styles.consentCard}>
                <View style={styles.consentHeader}>
                  <Text style={styles.consentAgent}>{consent.agentName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {consent.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.limitsGrid}>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitLabel}>Per Payment</Text>
                    <Text style={styles.limitValue}>{formatCurrency(consent.maxAmountPerPayment)}</Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitLabel}>Daily Limit</Text>
                    <Text style={styles.limitValue}>{formatCurrency(consent.dailyLimit)}</Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitLabel}>Monthly Limit</Text>
                    <Text style={styles.limitValue}>{formatCurrency(consent.monthlyLimit)}</Text>
                  </View>
                </View>

                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Used Today:</Text>
                  <Text style={styles.usageValue}>{formatCurrency(consent.amountUsedToday)}</Text>
                  <Text style={styles.usageSep}>|</Text>
                  <Text style={styles.usageLabel}>This Month:</Text>
                  <Text style={styles.usageValue}>{formatCurrency(consent.amountUsedMonth)}</Text>
                </View>

                {consent.appMandateId && (
                  <Text style={styles.linkedMandate}>
                    Linked APP Mandate: {consent.appMandateId.slice(0, 8)}...
                  </Text>
                )}

                {consent.expiryDate && (
                  <Text style={styles.expiryText}>
                    Expires: {new Date(consent.expiryDate).toLocaleDateString()}
                  </Text>
                )}

                {consent.status === 'active' && (
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => handleRevoke(consent)}
                  >
                    <Text style={styles.revokeButtonText}>Revoke Mandate</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Section B: Create VRP Consent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Recurring Payment Consent</Text>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Agent ID</Text>
            <TextInput
              style={styles.input}
              value={agentId}
              onChangeText={setAgentId}
              placeholder="e.g. default-shopping-agent"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Agent Name</Text>
            <TextInput
              style={styles.input}
              value={agentName}
              onChangeText={setAgentName}
              placeholder="e.g. Shopping Assistant"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Method</Text>
            {paymentMethods.length === 0 ? (
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={() => navigation.navigate('PaymentMethods')}
              >
                <Text style={styles.addPaymentText}>+ Add Payment Method</Text>
              </TouchableOpacity>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodSelector}>
                  {paymentMethods.map((method, idx) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.methodChip,
                        selectedMethodIndex === idx && styles.methodChipSelected,
                      ]}
                      onPress={() => setSelectedMethodIndex(idx)}
                    >
                      <Text
                        style={[
                          styles.methodChipText,
                          selectedMethodIndex === idx && styles.methodChipTextSelected,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.managePaymentLink}
                  onPress={() => navigation.navigate('PaymentMethods')}
                >
                  <Text style={styles.managePaymentLinkText}>+ Add or manage payment methods</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max Per Payment ($)</Text>
            <TextInput
              style={styles.input}
              value={maxPerPayment}
              onChangeText={setMaxPerPayment}
              keyboardType="decimal-pad"
              placeholder="100"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Daily Limit ($)</Text>
              <TextInput
                style={styles.input}
                value={dailyLimit}
                onChangeText={setDailyLimit}
                keyboardType="decimal-pad"
                placeholder="500"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Monthly Limit ($)</Text>
              <TextInput
                style={styles.input}
                value={monthlyLimit}
                onChangeText={setMonthlyLimit}
                keyboardType="decimal-pad"
                placeholder="2000"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expiry Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Recurring Payment Consent</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
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
  consentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  consentAgent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  limitsGrid: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  limitItem: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  limitValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 6,
  },
  usageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  usageValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  usageSep: {
    marginHorizontal: 8,
    color: '#D1D5DB',
  },
  linkedMandate: {
    fontSize: 11,
    color: '#4F46E5',
    marginTop: 4,
  },
  expiryText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  revokeButton: {
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  revokeButtonText: {
    color: '#991B1B',
    fontWeight: '600',
    fontSize: 14,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputGroup: {
    marginBottom: 14,
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
  methodSelector: {
    flexDirection: 'row',
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  methodChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  methodChipTextSelected: {
    color: '#4F46E5',
  },
  addPaymentButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addPaymentText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  managePaymentLink: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  managePaymentLinkText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
