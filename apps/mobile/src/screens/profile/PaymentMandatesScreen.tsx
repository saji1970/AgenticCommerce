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
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { useMandate } from '../../contexts/MandateContext';
import { AppConfig } from '../../config/app.config';
import {
  mandateServiceClient,
  AgentMandate,
  CreateCheckoutMandateRequest,
  CheckoutTransaction,
} from '../../services/mandate-service.client';

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

  const [consents, setConsents] = useState<AgentMandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [detailConsent, setDetailConsent] = useState<AgentMandate | null>(null);
  const [detailToken, setDetailToken] = useState<string | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<CheckoutTransaction[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [agentId, setAgentId] = useState(AppConfig.getDefaultAgent().id);
  const [agentName, setAgentName] = useState(AppConfig.getDefaultAgent().name);
  const [selectedMethodIndex, setSelectedMethodIndex] = useState(0);
  const [maxPerPayment, setMaxPerPayment] = useState('100');
  const [dailyLimit, setDailyLimit] = useState('500');
  const [monthlyLimit, setMonthlyLimit] = useState('2000');
  const [expiryDate, setExpiryDate] = useState('');
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [ruleIsDefault, setRuleIsDefault] = useState(false);
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleMinAmount, setRuleMinAmount] = useState('');
  const [ruleMaxAmount, setRuleMaxAmount] = useState('');


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
      const data = await mandateServiceClient.getUserCheckoutMandates(user.id);
      setConsents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load consents:', err);
      setConsents([]);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const data = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
      const methods: PaymentMethod[] = data ? JSON.parse(data) : [];
      setPaymentMethods(methods);
      setSelectedMethodIndex((i) => (i >= methods.length ? 0 : i));
    } catch {
      setPaymentMethods([]);
      setSelectedMethodIndex(0);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConsents();
    setRefreshing(false);
  }, [user?.id]);

  const findAppMandateForAgent = (aid: string): string | undefined => {
    const am = activeMandates ?? {};
    const mList = mandates ?? [];
    if (am.app && (am.app as any).agentId === aid) {
      return am.app.id;
    }
    const appMandate = mList.find(
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
    // expiryDate is always valid YYYY-MM-DD from the date picker (or empty)

    const selectedMethod = paymentMethods[selectedMethodIndex];
    const paymentMethod = selectedMethod
      ? { type: selectedMethod.type, label: selectedMethod.label, id: selectedMethod.id }
      : { type: 'card', label: 'Default Card' };

    const appMandateId = findAppMandateForAgent(agentId.trim());

    // Build usage rules
    const rules: Record<string, any> = {};
    if (ruleIsDefault) rules.isDefault = true;
    if (ruleCategory.trim()) rules.category = ruleCategory.trim().toUpperCase();
    if (ruleMinAmount.trim()) {
      const min = parseFloat(ruleMinAmount);
      if (!isNaN(min) && min > 0) rules.minAmount = min;
    }
    if (ruleMaxAmount.trim()) {
      const max = parseFloat(ruleMaxAmount);
      if (!isNaN(max) && max > 0) rules.maxAmount = max;
    }
    const constraints = Object.keys(rules).length > 0 ? { rules } : undefined;

    const request: CreateCheckoutMandateRequest = {
      userId: user.id,
      agentId: agentId.trim(),
      agentName: agentName.trim(),
      paymentMethod,
      maxAmountPerPayment: perPayment,
      ...(dailyLimit ? { dailyLimit: parseFloat(dailyLimit) } : {}),
      ...(monthlyLimit ? { monthlyLimit: parseFloat(monthlyLimit) } : {}),
      ...(expiryDate ? { expiryDate } : {}),
      ...(appMandateId ? { appMandateId } : {}),
      ...(constraints ? { constraints } : {}),
    };

    try {
      setCreating(true);
      const mandate = await mandateServiceClient.createCheckoutMandate(request);

      // Auto-approve
      const { consentToken } = await mandateServiceClient.approveCheckoutMandate(mandate.id, user.id);

      // Store consent token
      if (consentToken) {
        const existing = await AsyncStorage.getItem(VRP_CONSENT_TOKENS_KEY);
        const tokens = existing ? JSON.parse(existing) : {};
        tokens[mandate.id] = consentToken;
        await AsyncStorage.setItem(VRP_CONSENT_TOKENS_KEY, JSON.stringify(tokens));
      }

      Alert.alert('Success', 'Payment mandate created and activated');
      await loadConsents();
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      const statusCode = err.response?.status;
      let msg: string;
      if (typeof serverError === 'string' && serverError !== 'Error') {
        msg = serverError;
      } else if (err.message && err.message !== 'Error') {
        msg = err.message;
      } else if (statusCode === 502 || statusCode === 503) {
        msg = 'Mandate service is unavailable. Please try again later.';
      } else if (statusCode === 401) {
        msg = 'Authentication failed. Please log out and log in again.';
      } else if (!err.response) {
        msg = 'Network error. Please check your connection and try again.';
      } else {
        msg = `Request failed (status ${statusCode || 'unknown'}). Please try again.`;
      }
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const openConsentDetail = async (consent: AgentMandate) => {
    if (!consent?.id) return;
    setDetailConsent(consent);
    setDetailToken(null);
    setDetailTransactions([]);
    setLoadingDetail(true);
    try {
      const [storedTokens, txResult] = await Promise.all([
        AsyncStorage.getItem(VRP_CONSENT_TOKENS_KEY),
        mandateServiceClient.getCheckoutTransactions(consent.id).catch(() => ({ transactions: [], total: 0 })),
      ]);
      const tokens = storedTokens ? JSON.parse(storedTokens) : {};
      const tokenVal = tokens[consent.id];
      setDetailToken(typeof tokenVal === 'string' ? tokenVal : tokenVal?.token ?? consent.consentToken ?? null);
      setDetailTransactions(txResult?.transactions ?? []);
    } catch (e) {
      console.error('Failed to load consent detail:', e);
      setDetailTransactions([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRevoke = (consent: AgentMandate) => {
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
              await mandateServiceClient.revokeCheckoutMandate(consent.id, consent.userId, 'Revoked by user');
              await loadConsents();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to revoke mandate');
            }
          },
        },
      ]
    );
  };

  // Helper to extract checkout fields from AgentMandate constraints/columns
  const getCheckoutFields = (m: AgentMandate) => {
    const c = m.constraints || {};
    return {
      maxAmountPerPayment: c.maxAmountPerPayment ?? 0,
      dailyLimit: c.dailyLimit ?? (m as any).dailyLimit ?? null,
      monthlyLimit: c.monthlyLimit ?? (m as any).periodLimit ?? null,
      amountUsedToday: (m as any).amountUsedToday ?? 0,
      amountUsedMonth: (m as any).amountUsedPeriod ?? 0,
      appMandateId: m.parentMandateId ?? null,
      expiryDate: m.validUntil ?? null,
    };
  };

  // Inline rule extraction (previously from vrpRuleEngine)
  const extractRules = (m: AgentMandate) => {
    try {
      const rules = m.constraints?.rules;
      if (rules && typeof rules === 'object') return rules;
    } catch {}
    return {};
  };

  const getRuleSummary = (rules: any) => {
    const parts: string[] = [];
    if (rules.category) parts.push(rules.category.toUpperCase());
    if (typeof rules.minAmount === 'number') parts.push(`$${rules.minAmount}+`);
    if (typeof rules.maxAmount === 'number') parts.push(`<= $${rules.maxAmount}`);
    if (parts.length > 0) {
      const label = parts.join(', ');
      return rules.isDefault ? `${label} (Default)` : label;
    }
    if (rules.isDefault) return 'Default';
    return 'No rules';
  };

  const getStatusStyle = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.expired;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null || typeof amount !== 'number' || isNaN(amount)) return 'N/A';
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
        <Text style={styles.sectionTitle}>Active Checkout Payment Mandates</Text>
        {(consents ?? []).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={styles.emptyText}>No recurring payment consents</Text>
            <Text style={styles.emptySubtext}>Create a VRP consent to authorize AI agents for recurring payments</Text>
          </View>
        ) : (
          (consents ?? []).map((consent) => {
            const statusStyle = getStatusStyle(consent.status);
            const fields = getCheckoutFields(consent);
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
                    <Text style={styles.limitValue}>{formatCurrency(fields.maxAmountPerPayment)}</Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitLabel}>Daily Limit</Text>
                    <Text style={styles.limitValue}>{formatCurrency(fields.dailyLimit)}</Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={styles.limitLabel}>Monthly Limit</Text>
                    <Text style={styles.limitValue}>{formatCurrency(fields.monthlyLimit)}</Text>
                  </View>
                </View>

                {(() => {
                  const rules = extractRules(consent);
                  const summary = getRuleSummary(rules);
                  if (summary === 'No rules') return null;
                  return (
                    <View style={styles.rulesRow}>
                      {rules.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                      )}
                      <Text style={styles.rulesSummary}>Rules: {summary}</Text>
                    </View>
                  );
                })()}

                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Used Today:</Text>
                  <Text style={styles.usageValue}>{formatCurrency(fields.amountUsedToday)}</Text>
                  <Text style={styles.usageSep}>|</Text>
                  <Text style={styles.usageLabel}>This Month:</Text>
                  <Text style={styles.usageValue}>{formatCurrency(fields.amountUsedMonth)}</Text>
                </View>

                {fields.appMandateId && (
                  <Text style={styles.linkedMandate}>
                    Linked APP Mandate: {fields.appMandateId.slice(0, 8)}...
                  </Text>
                )}

                {fields.expiryDate && (
                  <Text style={styles.expiryText}>
                    Expires: {new Date(fields.expiryDate).toLocaleDateString()}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.tokenButton}
                  onPress={() => openConsentDetail(consent)}
                >
                  <Text style={styles.tokenButtonText}>
                    {consent.status === 'active' ? '🔑 View Payment Token & Transactions' : '📋 View Details & Transactions'}
                  </Text>
                </TouchableOpacity>

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
        <Text style={styles.sectionTitle}>Create Checkout Payment Mandate</Text>
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
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowExpiryPicker(true)}
            >
              <Text style={{ color: expiryDate ? '#111827' : '#9CA3AF', fontSize: 16 }}>
                {expiryDate || 'Select expiry date'}
              </Text>
            </TouchableOpacity>
            {expiryDate ? (
              <TouchableOpacity onPress={() => setExpiryDate('')}>
                <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 4 }}>Clear date</Text>
              </TouchableOpacity>
            ) : null}
            {showExpiryPicker && (
              <DateTimePicker
                value={expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 86400000)}
                mode="date"
                display="default"
                minimumDate={new Date(Date.now() + 86400000)}
                onChange={(event, selectedDate) => {
                  setShowExpiryPicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    const yyyy = selectedDate.getFullYear();
                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                    setExpiryDate(`${yyyy}-${mm}-${dd}`);
                  }
                }}
              />
            )}
          </View>

          {/* Usage Rules */}
          <View style={styles.rulesSection}>
            <Text style={styles.rulesSectionTitle}>Usage Rules (optional)</Text>
            <Text style={styles.rulesSectionSubtext}>
              Configure rules to auto-select this mandate at checkout based on transaction type and amount.
            </Text>

            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => setRuleIsDefault(!ruleIsDefault)}
            >
              <View style={[styles.toggleTrack, ruleIsDefault && styles.toggleTrackOn]}>
                <View style={[styles.toggleThumb, ruleIsDefault && styles.toggleThumbOn]} />
              </View>
              <Text style={styles.defaultToggleLabel}>Use as default (fallback)</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Transaction Category</Text>
              <TextInput
                style={styles.input}
                value={ruleCategory}
                onChangeText={setRuleCategory}
                placeholder="e.g. TRAVEL, FOOD, ELECTRONICS"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Min Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={ruleMinAmount}
                  onChangeText={setRuleMinAmount}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 500"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Max Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={ruleMaxAmount}
                  onChangeText={setRuleMaxAmount}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2000"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Checkout Payment Mandate</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Consent Detail Modal */}
      <Modal
        visible={!!detailConsent}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailConsent(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetailConsent(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {detailConsent && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Payment Token & Details</Text>
                  <TouchableOpacity onPress={() => setDetailConsent(null)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailLabel}>Agent</Text>
                  <Text style={styles.detailValue}>{detailConsent.agentName}</Text>

                  <Text style={styles.detailLabel}>Payment Token</Text>
                  {loadingDetail ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                  ) : detailToken ? (
                    <View style={styles.tokenBox}>
                      <Text style={styles.tokenText} selectable>
                        {detailToken.length > 40 ? `${detailToken.slice(0, 20)}...${detailToken.slice(-16)}` : detailToken}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.detailMuted}>No token stored</Text>
                  )}

                  <Text style={styles.detailLabel}>Limits</Text>
                  <Text style={styles.detailValue}>
                    Per: {formatCurrency(getCheckoutFields(detailConsent).maxAmountPerPayment)} | Daily: {formatCurrency(getCheckoutFields(detailConsent).dailyLimit)} | Monthly: {formatCurrency(getCheckoutFields(detailConsent).monthlyLimit)}
                  </Text>

                  <Text style={styles.detailLabel}>Usage</Text>
                  <Text style={styles.detailValue}>
                    Today: {formatCurrency(getCheckoutFields(detailConsent).amountUsedToday)} | Month: {formatCurrency(getCheckoutFields(detailConsent).amountUsedMonth)}
                  </Text>

                  <Text style={[styles.detailLabel, { marginTop: 16 }]}>Transactions ({detailTransactions.length})</Text>
                  {detailTransactions.length === 0 ? (
                    <Text style={styles.detailMuted}>No transactions yet</Text>
                  ) : (
                    detailTransactions.map((tx) => (
                      <View key={tx.id} style={styles.txRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txAmount}>{formatCurrency(tx?.amount)} {tx?.currency || 'USD'}</Text>
                          <Text style={styles.txMeta}>
                            {tx.description || 'Payment'} • {new Date(tx.createdAt).toLocaleString()}
                          </Text>
                          {tx.transactionId && (
                            <Text style={styles.txId}>ID: {tx.transactionId}</Text>
                          )}
                        </View>
                        <View style={[styles.txStatusBadge, { backgroundColor: tx.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }]}>
                          <Text style={[styles.txStatusText, { color: tx.status === 'completed' ? '#065F46' : '#92400E' }]}>
                            {tx.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  tokenButton: {
    marginTop: 10,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tokenButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 4,
  },
  detailMuted: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  tokenBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 13,
    color: '#374151',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  txMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  txId: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  txStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rulesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  rulesSummary: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  rulesSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  rulesSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  rulesSectionSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 16,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    backgroundColor: '#4F46E5',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  defaultToggleLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
