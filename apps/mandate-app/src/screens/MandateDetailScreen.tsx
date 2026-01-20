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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AgentMandate } from '../services/mandate-service.client';
import { mandateServiceClient } from '../services/mandate-service.client';
import { useMandates } from '../contexts/MandateContext';
import { SignaturePad } from '../components/SignaturePad';
import signatureService from '../services/signature.service';

const AGENTIC_COMMERCE_SCHEME = 'agenticcommerce://';

export const MandateDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { refreshMandates } = useMandates();
  const { mandateId } = route.params as { mandateId: string };
  
  const [mandate, setMandate] = useState<AgentMandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    loadMandate();
  }, [mandateId]);

  const loadMandate = async () => {
    try {
      const mandateData = await mandateServiceClient.getMandate(mandateId);
      setMandate(mandateData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load mandate');
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
      // Create signature
      const mandateText = getMandateText();
      await signatureService.createSignature({
        mandateId: mandate!.id,
        mandateText,
        signatureImageUrl: signatureData,
      });

      // Approve mandate
      await mandateServiceClient.approveMandate(mandateId, mandate!.userId);
      await refreshMandates();
      
      // If payment mandate, process payment
      let paymentId: string | undefined;
      if (mandate!.type === 'payment') {
        try {
          // Call mandate-service to process payment
          // The mandate-service will call the payment gateway
          // Note: Amount and payment details should come from the intent/cart
          // For now, we'll process a minimal payment to complete the flow
          // In a real scenario, this would be triggered from the AgenticCommerce app after mandate approval
          console.log('Payment mandate approved - payment processing can be initiated from AgenticCommerce app');
          
          // Payment processing will be handled by the AgenticCommerce app when it receives the callback
          // The AgenticCommerce app will call the mandate-service payment endpoint with the actual amount
        } catch (paymentError) {
          console.error('Payment processing error:', paymentError);
          // Still proceed with approval even if payment fails
          // Payment can be retried later
        }
      }

      // Send deep link back to AgenticCommerce app
      const callbackUrl = `${AGENTIC_COMMERCE_SCHEME}payment-callback?mandateId=${mandateId}&status=approved${paymentId ? `&paymentId=${paymentId}` : ''}`;
      
      try {
        const canOpen = await Linking.canOpenURL(callbackUrl);
        if (canOpen) {
          await Linking.openURL(callbackUrl);
        }
      } catch (linkError) {
        console.error('Error opening deep link:', linkError);
        // Continue anyway - user can manually return to AgenticCommerce app
      }

      Alert.alert('Success', 'Mandate approved and signed. Returning to AgenticCommerce...', [
        { 
          text: 'OK', 
          onPress: () => {
            // Try to open AgenticCommerce app if deep link didn't work
            Linking.openURL(callbackUrl).catch(() => {
              navigation.goBack();
            });
          }
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to approve mandate');
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
              Alert.alert('Error', 'Failed to revoke mandate');
            }
          },
        },
      ]
    );
  };

  const getMandateText = (): string => {
    if (!mandate) return '';
    const constraintsText = JSON.stringify(mandate.constraints, null, 2);
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
        <Text style={styles.agentName}>{mandate.agentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mandate.status) }]}>
          <Text style={styles.statusText}>{mandate.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{mandate.type}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Constraints</Text>
        <Text style={styles.constraintsText}>
          {JSON.stringify(mandate.constraints, null, 2)}
        </Text>
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
              I have read and agree to authorize this AI agent
            </Text>
          </TouchableOpacity>

          {!signatureData && (
            <TouchableOpacity
              style={styles.signatureButton}
              onPress={() => setShowSignaturePad(true)}
            >
              <Text style={styles.signatureButtonText}>Add Signature</Text>
            </TouchableOpacity>
          )}

          {signatureData && (
            <View style={styles.signatureAdded}>
              <Text style={styles.signatureAddedText}>✓ Signature Added</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.approveButton, (!agreed || !signatureData || signing) && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={!agreed || !signatureData || signing}
          >
            {signing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.approveButtonText}>Approve & Sign</Text>
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
    marginBottom: 16,
  },
  signatureAddedText: {
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
