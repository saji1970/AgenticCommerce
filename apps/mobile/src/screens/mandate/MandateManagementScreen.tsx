import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mandate, MandateStatus, MandateType, PurchaseIntent } from '@agentic-commerce/shared-types';
import mandateService from '../../services/mandate.service';

export const MandateManagementScreen: React.FC = () => {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [pendingIntents, setPendingIntents] = useState<PurchaseIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mandates' | 'intents'>('mandates');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mandatesData, intentsData] = await Promise.all([
        mandateService.getMyMandates(),
        mandateService.getPurchaseIntents('pending'),
      ]);
      setMandates(mandatesData);
      setPendingIntents(intentsData);
    } catch (error) {
      console.error('Error loading mandate data:', error);
      Alert.alert('Error', 'Failed to load mandate data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSuspendMandate = async (mandateId: string) => {
    Alert.alert(
      'Suspend Mandate',
      'Are you sure you want to suspend this mandate? The AI agent will no longer be able to perform actions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await mandateService.suspendMandate(mandateId);
              await loadData();
              Alert.alert('Success', 'Mandate suspended successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to suspend mandate');
            }
          },
        },
      ]
    );
  };

  const handleRevokeMandate = async (mandateId: string) => {
    Alert.alert(
      'Revoke Mandate',
      'Are you sure you want to permanently revoke this mandate? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await mandateService.revokeMandate(mandateId, 'User revoked mandate');
              await loadData();
              Alert.alert('Success', 'Mandate revoked successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke mandate');
            }
          },
        },
      ]
    );
  };

  const handleApproveIntent = async (intentId: string) => {
    Alert.alert(
      'Approve Intent',
      'Approve this purchase intent? The AI agent will be able to execute this purchase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await mandateService.approveIntent(intentId);
              await loadData();
              Alert.alert('Success', 'Purchase intent approved');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve intent');
            }
          },
        },
      ]
    );
  };

  const handleRejectIntent = async (intentId: string) => {
    Alert.alert(
      'Reject Intent',
      'Reject this purchase intent? The AI agent will not proceed with this purchase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await mandateService.rejectIntent(intentId, 'User rejected intent');
              await loadData();
              Alert.alert('Success', 'Purchase intent rejected');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject intent');
            }
          },
        },
      ]
    );
  };

  const getMandateIcon = (type: MandateType) => {
    switch (type) {
      case MandateType.CART:
        return '🛒';
      case MandateType.INTENT:
        return '💭';
      case MandateType.PAYMENT:
        return '💳';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: MandateStatus) => {
    switch (status) {
      case MandateStatus.ACTIVE:
        return '#10B981';
      case MandateStatus.PENDING:
        return '#F59E0B';
      case MandateStatus.SUSPENDED:
        return '#EF4444';
      case MandateStatus.REVOKED:
        return '#6B7280';
      case MandateStatus.EXPIRED:
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  const renderMandate = (mandate: Mandate) => (
    <View key={mandate.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Text style={styles.mandateIcon}>{getMandateIcon(mandate.type)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.agentName}>{mandate.agentName}</Text>
          <Text style={styles.mandateType}>{mandate.type.toUpperCase()} MANDATE</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mandate.status) }]}>
          <Text style={styles.statusText}>{mandate.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.sectionLabel}>Permissions:</Text>
        {mandate.type === MandateType.CART && (
          <>
            <Text style={styles.constraintText}>
              • Max item value: ${(mandate.constraints as any).maxItemValue || 'N/A'}
            </Text>
            <Text style={styles.constraintText}>
              • Daily limit: {(mandate.constraints as any).maxItemsPerDay || 'Unlimited'} items
            </Text>
          </>
        )}
        {mandate.type === MandateType.INTENT && (
          <>
            <Text style={styles.constraintText}>
              • Max intent value: ${(mandate.constraints as any).maxIntentValue || 'N/A'}
            </Text>
            <Text style={styles.constraintText}>
              • Auto-approve under: ${(mandate.constraints as any).autoApproveUnder || 'N/A'}
            </Text>
          </>
        )}
        {mandate.type === MandateType.PAYMENT && (
          <>
            <Text style={styles.constraintText}>
              • Max transaction: ${(mandate.constraints as any).maxTransactionAmount || 'N/A'}
            </Text>
            <Text style={styles.constraintText}>
              • Daily limit: ${(mandate.constraints as any).dailySpendingLimit || 'N/A'}
            </Text>
          </>
        )}

        <Text style={styles.dateText}>
          Created: {new Date(mandate.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {mandate.status === MandateStatus.ACTIVE && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.suspendButton]}
            onPress={() => handleSuspendMandate(mandate.id)}
          >
            <Text style={styles.actionButtonText}>Suspend</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.revokeButton]}
            onPress={() => handleRevokeMandate(mandate.id)}
          >
            <Text style={styles.actionButtonText}>Revoke</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderIntent = (intent: PurchaseIntent) => (
    <View key={intent.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Text style={styles.mandateIcon}>💡</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.agentName}>{intent.items[0]?.productName || 'Purchase Intent'}</Text>
          <Text style={styles.mandateType}>BY {intent.agentId}</Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>${intent.total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.sectionLabel}>Reasoning:</Text>
        <Text style={styles.reasoningText}>{intent.reasoning}</Text>

        <Text style={styles.sectionLabel}>Items:</Text>
        {intent.items.map((item, index) => (
          <Text key={index} style={styles.itemText}>
            • {item.productName} x{item.quantity} - ${item.price.toFixed(2)}
          </Text>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total (incl. tax):</Text>
          <Text style={styles.totalValue}>${intent.total.toFixed(2)}</Text>
        </View>

        <Text style={styles.dateText}>
          Expires: {new Date(intent.expiresAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectIntent(intent.id)}
        >
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApproveIntent(intent.id)}
        >
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading mandates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Mandates</Text>
        <Text style={styles.headerSubtitle}>Manage your AI agent permissions</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mandates' && styles.tabActive]}
          onPress={() => setActiveTab('mandates')}
        >
          <Text style={[styles.tabText, activeTab === 'mandates' && styles.tabTextActive]}>
            Mandates ({mandates.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'intents' && styles.tabActive]}
          onPress={() => setActiveTab('intents')}
        >
          <Text style={[styles.tabText, activeTab === 'intents' && styles.tabTextActive]}>
            Pending Intents ({pendingIntents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'mandates' && (
          <>
            {mandates.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🤖</Text>
                <Text style={styles.emptyTitle}>No Mandates Yet</Text>
                <Text style={styles.emptyText}>
                  Create a mandate to authorize AI agents to help with your shopping
                </Text>
              </View>
            ) : (
              mandates.map(renderMandate)
            )}
          </>
        )}

        {activeTab === 'intents' && (
          <>
            {pendingIntents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💭</Text>
                <Text style={styles.emptyTitle}>No Pending Intents</Text>
                <Text style={styles.emptyText}>
                  When AI agents find good deals, they'll appear here for your approval
                </Text>
              </View>
            ) : (
              pendingIntents.map(renderIntent)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mandateIcon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  mandateType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cardBody: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  constraintText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  suspendButton: {
    backgroundColor: '#FEF3C7',
  },
  revokeButton: {
    backgroundColor: '#FEE2E2',
  },
  approveButton: {
    backgroundColor: '#4F46E5',
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
