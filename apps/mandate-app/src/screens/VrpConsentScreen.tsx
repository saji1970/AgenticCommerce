import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { SignaturePad } from '../components/SignaturePad';
import secureElementService from '../services/secure-element.service';
import { paymentGatewayClient, VrpConsent, VrpTransaction } from '../services/payment-gateway.client';
import { mandateServiceClient } from '../services/mandate-service.client';

interface PaymentMethod {
  id: string;
  type: string;
  label: string;
  last4: string;
  expiryMonth?: string;
  expiryYear?: string;
}

export const VrpConsentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Form state
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [maxPerPayment, setMaxPerPayment] = useState('50');
  const [dailyLimit, setDailyLimit] = useState('100');
  const [monthlyLimit, setMonthlyLimit] = useState('500');
  const [expiryDate, setExpiryDate] = useState('');

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Existing consents
  const [consents, setConsents] = useState<VrpConsent[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(false);

  // Approval flow
  const [step, setStep] = useState<'configure' | 'approve'>('configure');
  const [agreed, setAgreed] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'pin' | 'none'>('none');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [approving, setApproving] = useState(false);

  // Mandate linkage
  const [appMandateId, setAppMandateId] = useState<string | null>(null);

  // UI
  const [refreshing, setRefreshing] = useState(false);
  const [createdConsentId, setCreatedConsentId] = useState<string | null>(null);
  const [detailConsent, setDetailConsent] = useState<VrpConsent | null>(null);
  const [detailToken, setDetailToken] = useState<string | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<VrpTransaction[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadBiometricType();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
      loadExistingConsents();
    }, [user])
  );

  const loadBiometricType = async () => {
    const type = await secureElementService.getBiometricType();
    setBiometricType(type);
  };

  const loadPaymentMethods = async () => {
    try {
      const data = await AsyncStorage.getItem('payment_methods');
      const methods: PaymentMethod[] = data ? JSON.parse(data) : [];
      setPaymentMethods(methods);
      if (methods.length > 0 && !selectedPaymentMethod) {
        setSelectedPaymentMethod(methods[0]);
      }
    } catch {
      setPaymentMethods([]);
    }
  };

  const loadExistingConsents = async () => {
    if (!user?.id) return;
    setLoadingConsents(true);
    try {
      const userConsents = await paymentGatewayClient.getUserConsents(user.id);
      setConsents(Array.isArray(userConsents) ? userConsents : []);
    } catch (error) {
      console.log('Could not load consents:', error);
      setConsents([]);
    } finally {
      setLoadingConsents(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExistingConsents();
    setRefreshing(false);
  };

  const handleProceedToApprove = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }
    if (!agentId || !agentName) {
      Alert.alert('Error', 'Please enter agent ID and name');
      return;
    }
    if (!maxPerPayment || parseFloat(maxPerPayment) <= 0) {
      Alert.alert('Error', 'Please enter a valid max payment amount');
      return;
    }

    // Auto-lookup active APP mandate for this agent
    if (user?.id) {
      try {
        const appMandates = await mandateServiceClient.getUserMandates(user.id, 'active', 'app');
        const match = appMandates.find(m => m.agentId === agentId);
        if (match) {
          setAppMandateId(match.id);
        } else {
          setAppMandateId(null);
        }
      } catch {
        setAppMandateId(null);
      }
    }

    setStep('approve');
  };

  const handleBiometricVerification = async () => {
    try {
      const success = await secureElementService.authenticate(
        'Verify identity to approve recurring payment consent'
      );
      if (success) {
        setBiometricVerified(true);
      } else {
        Alert.alert('Verification Failed', 'Biometric verification was not successful');
      }
    } catch (error) {
      Alert.alert('Error', 'Biometric verification failed');
    }
  };

  const handleApprove = async () => {
    if (!user?.id || !selectedPaymentMethod) return;
    setApproving(true);

    try {
      // Step 1: Create consent
      const consent = await paymentGatewayClient.createConsent({
        userId: user.id,
        agentId,
        agentName,
        paymentMethod: {
          type: selectedPaymentMethod.type,
          last4: selectedPaymentMethod.last4,
          label: selectedPaymentMethod.label,
        },
        maxAmountPerPayment: parseFloat(maxPerPayment),
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
        expiryDate: expiryDate || undefined,
        appMandateId: appMandateId || undefined,
      });

      // Step 2: Approve consent
      const result = await paymentGatewayClient.approveConsent(consent.id, user.id);

      // Step 3: Store token locally
      const existingTokens = await AsyncStorage.getItem('vrp_consent_tokens');
      const tokens = existingTokens ? JSON.parse(existingTokens) : {};
      tokens[consent.id] = {
        token: result.consentToken,
        agentId,
        agentName,
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('vrp_consent_tokens', JSON.stringify(tokens));

      Alert.alert(
        'Consent Approved',
        `Recurring payment consent for ${agentName} has been authorized.`,
        [{ text: 'OK', onPress: () => resetForm() }]
      );

      await loadExistingConsents();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create consent');
    } finally {
      setApproving(false);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    if (!user?.id) return;
    Alert.alert(
      'Revoke Consent',
      'Are you sure you want to revoke this recurring payment consent?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentGatewayClient.revokeConsent(consentId, user.id, 'User revoked');
              await loadExistingConsents();
              Alert.alert('Success', 'Consent has been revoked');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke consent');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setStep('configure');
    setAgreed(false);
    setBiometricVerified(false);
    setSignatureData(null);
    setCreatedConsentId(null);
    setAgentId('');
    setAgentName('');
    setAppMandateId(null);
  };

  const openConsentDetail = async (consent: VrpConsent) => {
    if (!consent?.id) return;
    setDetailConsent(consent);
    setDetailToken(null);
    setDetailTransactions([]);
    setLoadingDetail(true);
    try {
      const [storedTokens, txResult] = await Promise.all([
        AsyncStorage.getItem('vrp_consent_tokens'),
        paymentGatewayClient.getTransactions(consent.id).catch(() => ({ transactions: [], total: 0 })),
      ]);
      const tokens = storedTokens ? JSON.parse(storedTokens) : {};
      const stored = tokens[consent.id];
      const tokenVal = typeof stored === 'string' ? stored : stored?.token;
      setDetailToken(tokenVal || consent.consentToken || null);
      setDetailTransactions(txResult?.transactions ?? []);
    } catch (e) {
      console.error('Failed to load consent detail:', e);
      setDetailTransactions([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#059669';
      case 'pending': return '#D97706';
      case 'suspended': return '#DC2626';
      case 'revoked': return '#6B7280';
      case 'expired': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Existing Consents */}
      {(consents ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Consents</Text>
          {(consents ?? []).map(consent => (
            <View key={consent.id} style={styles.consentCard}>
              <View style={styles.consentHeader}>
                <Text style={styles.consentAgent}>{consent.agentName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(consent.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(consent.status) }]}>
                    {consent.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.consentDetail}>
                Max per payment: ${(consent.maxAmountPerPayment ?? 0).toFixed(2)}
              </Text>
              {consent.dailyLimit != null && (
                <Text style={styles.consentDetail}>Daily limit: ${Number(consent.dailyLimit).toFixed(2)}</Text>
              )}
              {consent.monthlyLimit != null && (
                <Text style={styles.consentDetail}>Monthly limit: ${Number(consent.monthlyLimit).toFixed(2)}</Text>
              )}
              <Text style={styles.consentDetail}>
                Payment: {consent.paymentMethod?.label || 'N/A'}
              </Text>
              {consent.appMandateId && (
                <Text style={styles.consentDetail}>
                  APP Mandate: {consent.appMandateId.slice(0, 8)}...
                </Text>
              )}
              <TouchableOpacity
                style={styles.viewTokenButton}
                onPress={() => openConsentDetail(consent)}
              >
                <Text style={styles.viewTokenButtonText}>
                  {consent.status === 'active' ? '🔑 View Payment Token & Transactions' : '📋 View Details & Transactions'}
                </Text>
              </TouchableOpacity>
              {consent.status === 'active' && (
                <TouchableOpacity
                  style={styles.revokeButton}
                  onPress={() => handleRevokeConsent(consent.id)}
                >
                  <Text style={styles.revokeButtonText}>Revoke</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Configure Section */}
      {step === 'configure' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Checkout Payment Mandate</Text>

          {/* Agent Info */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>AI Agent ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., shopping-agent-1"
              value={agentId}
              onChangeText={setAgentId}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>AI Agent Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Shopping Assistant"
              value={agentName}
              onChangeText={setAgentName}
            />
          </View>

          {/* Payment Method */}
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
                {paymentMethods.map(pm => (
                  <TouchableOpacity
                    key={pm.id}
                    style={[
                      styles.paymentMethodOption,
                      selectedPaymentMethod?.id === pm.id && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod(pm)}
                  >
                    <Text style={styles.paymentMethodIcon}>
                      {pm.type === 'card' ? '💳' : pm.type === 'paypal' ? '🅿️' : '🏦'}
                    </Text>
                    <Text style={styles.paymentMethodLabel}>{pm.label}</Text>
                    {selectedPaymentMethod?.id === pm.id && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.configurePaymentButton}
                  onPress={() => navigation.navigate('PaymentMethods')}
                >
                  <Text style={styles.configurePaymentText}>+ Add or manage payment methods</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Limits */}
          <Text style={styles.subTitle}>Payment Limits</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max per Payment ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="50.00"
              value={maxPerPayment}
              onChangeText={setMaxPerPayment}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Daily Limit ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="100.00"
              value={dailyLimit}
              onChangeText={setDailyLimit}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monthly Limit ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="500.00"
              value={monthlyLimit}
              onChangeText={setMonthlyLimit}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-12-31"
              value={expiryDate}
              onChangeText={setExpiryDate}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToApprove}>
            <Text style={styles.proceedButtonText}>Proceed to Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Approval Section */}
      {step === 'approve' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approve Consent</Text>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Consent Summary</Text>
            <Text style={styles.summaryRow}>Agent: {agentName} ({agentId})</Text>
            <Text style={styles.summaryRow}>Payment: {selectedPaymentMethod?.label}</Text>
            <Text style={styles.summaryRow}>Max per payment: ${maxPerPayment}</Text>
            {dailyLimit && <Text style={styles.summaryRow}>Daily limit: ${dailyLimit}</Text>}
            {monthlyLimit && <Text style={styles.summaryRow}>Monthly limit: ${monthlyLimit}</Text>}
            {expiryDate && <Text style={styles.summaryRow}>Expires: {expiryDate}</Text>}
            {appMandateId && (
              <Text style={styles.summaryRow}>Linked APP Mandate: {appMandateId.slice(0, 8)}...</Text>
            )}
          </View>

          {/* Agreement */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgreed(!agreed)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I authorize this AI agent to make recurring payments within the specified limits
            </Text>
          </TouchableOpacity>

          {/* Step 1: Biometric */}
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

          {/* Step 2: Signature */}
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
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Signature Added</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSignaturePad(true)}>
                  <Text style={styles.changeLink}>Change signature</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Approve Button */}
          <TouchableOpacity
            style={[
              styles.approveButton,
              (!agreed || !signatureData || !biometricVerified || approving) && styles.buttonDisabled,
            ]}
            onPress={handleApprove}
            disabled={!agreed || !signatureData || !biometricVerified || approving}
          >
            {approving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.approveButtonText}>Approve & Authorize</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setStep('configure')}
          >
            <Text style={styles.cancelButtonText}>Back to Configuration</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Signature Pad Modal */}
      <Modal
        visible={showSignaturePad}
        animationType="slide"
        onRequestClose={() => setShowSignaturePad(false)}
      >
        <View style={styles.modalContainer}>
          <SignaturePad
            onSave={(data: string) => {
              setSignatureData(data);
              setShowSignaturePad(false);
            }}
          />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowSignaturePad(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Consent Detail Modal - Payment Token & Transactions */}
      <Modal
        visible={!!detailConsent}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailConsent(null)}
      >
        <TouchableOpacity style={styles.detailModalOverlay} activeOpacity={1} onPress={() => setDetailConsent(null)}>
          <TouchableOpacity style={styles.detailModalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {detailConsent && (
              <>
                <View style={styles.detailModalHeader}>
                  <Text style={styles.detailModalTitle}>Payment Token & Details</Text>
                  <TouchableOpacity onPress={() => setDetailConsent(null)}>
                    <Text style={styles.detailModalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailLabel}>Agent</Text>
                  <Text style={styles.detailValue}>{detailConsent.agentName}</Text>

                  <Text style={styles.detailLabel}>Payment Token</Text>
                  {loadingDetail ? (
                    <ActivityIndicator size="small" color="#2563EB" />
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
                    Per: ${(detailConsent.maxAmountPerPayment ?? 0).toFixed(2)} | Daily: {detailConsent.dailyLimit != null ? `$${Number(detailConsent.dailyLimit).toFixed(2)}` : 'N/A'} | Monthly: {detailConsent.monthlyLimit != null ? `$${Number(detailConsent.monthlyLimit).toFixed(2)}` : 'N/A'}
                  </Text>

                  <Text style={styles.detailLabel}>Usage</Text>
                  <Text style={styles.detailValue}>
                    Today: ${(detailConsent.amountUsedToday ?? 0).toFixed(2)} | Month: ${(detailConsent.amountUsedMonth ?? 0).toFixed(2)}
                  </Text>

                  <Text style={[styles.detailLabel, { marginTop: 16 }]}>Transactions ({detailTransactions.length})</Text>
                  {detailTransactions.length === 0 ? (
                    <Text style={styles.detailMuted}>No transactions yet</Text>
                  ) : (
                    detailTransactions.map((tx) => (
                      <View key={tx.id} style={styles.txRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txAmount}>${(tx.amount ?? 0).toFixed(2)} {tx.currency || 'USD'}</Text>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bottomPadding} />
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
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  addPaymentButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addPaymentText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  configurePaymentButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  configurePaymentText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentMethodSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  checkIcon: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '700',
  },
  proceedButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Consent cards
  consentCard: {
    backgroundColor: '#FFFFFF',
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
    marginBottom: 8,
  },
  consentAgent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  consentDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  viewTokenButton: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewTokenButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  revokeButton: {
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  revokeButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailModalClose: {
    fontSize: 24,
    color: '#6B7280',
    padding: 4,
  },
  detailModalBody: {
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
  // Summary
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  summaryRow: {
    fontSize: 14,
    color: '#1E3A5F',
    marginBottom: 4,
  },
  // Approval flow
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
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
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 14,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  biometricButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  verifiedText: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  signatureButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  changeLink: {
    color: '#2563EB',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  approveButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 60,
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
