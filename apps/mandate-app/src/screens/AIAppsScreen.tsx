import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMandates } from '../contexts/MandateContext';
import { MandateLimitsEditor, MandateLimits } from '../components/MandateLimitsEditor';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AIApp {
  agentId: string;
  agentName: string;
  mandates: Array<{
    id: string;
    type: string;
    status: string;
    constraints: any;
  }>;
  totalActive: number;
  aggregateLimits: MandateLimits;
}

const DEFAULT_LIMITS_KEY = 'default_spending_limits';

export const AIAppsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { mandates, loading, refreshMandates } = useMandates();
  const [selectedApp, setSelectedApp] = useState<AIApp | null>(null);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [editingLimits, setEditingLimits] = useState<MandateLimits | null>(null);

  // Group mandates by AI agent
  const aiApps = useMemo(() => {
    const appMap = new Map<string, AIApp>();

    mandates.forEach((mandate) => {
      const existingApp = appMap.get(mandate.agentId);

      const mandateData = {
        id: mandate.id,
        type: mandate.type,
        status: mandate.status,
        constraints: mandate.constraints || {},
      };

      if (existingApp) {
        existingApp.mandates.push(mandateData);
        if (mandate.status === 'active') {
          existingApp.totalActive++;
        }
        // Aggregate limits (use max values)
        if (mandate.constraints) {
          existingApp.aggregateLimits.maxTransactionAmount = Math.max(
            existingApp.aggregateLimits.maxTransactionAmount,
            mandate.constraints.maxTransactionAmount || 0
          );
          existingApp.aggregateLimits.dailySpendingLimit = Math.max(
            existingApp.aggregateLimits.dailySpendingLimit,
            mandate.constraints.dailySpendingLimit || mandate.constraints.dailyLimit || 0
          );
          existingApp.aggregateLimits.monthlySpendingLimit = Math.max(
            existingApp.aggregateLimits.monthlySpendingLimit,
            mandate.constraints.monthlySpendingLimit || mandate.constraints.monthlyLimit || 0
          );
        }
      } else {
        appMap.set(mandate.agentId, {
          agentId: mandate.agentId,
          agentName: mandate.agentName,
          mandates: [mandateData],
          totalActive: mandate.status === 'active' ? 1 : 0,
          aggregateLimits: {
            maxTransactionAmount: mandate.constraints?.maxTransactionAmount || 500,
            dailySpendingLimit: mandate.constraints?.dailySpendingLimit || mandate.constraints?.dailyLimit || 1000,
            monthlySpendingLimit: mandate.constraints?.monthlySpendingLimit || mandate.constraints?.monthlyLimit || 5000,
            requiresTwoFactor: mandate.constraints?.requiresTwoFactor ?? true,
          },
        });
      }
    });

    return Array.from(appMap.values()).sort((a, b) => b.totalActive - a.totalActive);
  }, [mandates]);

  const activeApps = aiApps.filter(app => app.totalActive > 0);
  const inactiveApps = aiApps.filter(app => app.totalActive === 0);

  const handleAppPress = (app: AIApp) => {
    setSelectedApp(app);
    setEditingLimits(app.aggregateLimits);
    setIsLimitsModalOpen(true);
  };

  const handleSaveLimits = async () => {
    if (!selectedApp || !editingLimits) return;

    // In a real app, this would update the backend
    // For now, we'll show a success message
    Alert.alert(
      'Limits Updated',
      `Transaction limits for ${selectedApp.agentName} have been updated.`,
      [{ text: 'OK', onPress: () => setIsLimitsModalOpen(false) }]
    );
  };

  const handleViewMandates = (app: AIApp) => {
    setIsLimitsModalOpen(false);
    // Navigate to mandates filtered by this agent
    (navigation as any).navigate('Mandates', {
      screen: 'MandatesList',
      params: { filterAgentId: app.agentId },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'revoked': return '#EF4444';
      case 'suspended': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const renderAppCard = (app: AIApp, showActive: boolean = true) => (
    <TouchableOpacity
      key={app.agentId}
      style={styles.appCard}
      onPress={() => handleAppPress(app)}
    >
      <View style={styles.appHeader}>
        <View style={styles.appIcon}>
          <Text style={styles.appIconText}>
            {app.agentName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{app.agentName}</Text>
          <View style={styles.mandateCounts}>
            {app.mandates.map((mandate, idx) => (
              <View
                key={idx}
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(mandate.status) },
                ]}
              />
            ))}
            <Text style={styles.mandateCountText}>
              {app.totalActive} active mandate{app.totalActive !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.appArrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </View>

      <View style={styles.limitsPreview}>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Per Transaction</Text>
          <Text style={styles.limitValue}>
            {formatCurrency(app.aggregateLimits.maxTransactionAmount)}
          </Text>
        </View>
        <View style={styles.limitDivider} />
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Daily Limit</Text>
          <Text style={styles.limitValue}>
            {formatCurrency(app.aggregateLimits.dailySpendingLimit)}
          </Text>
        </View>
        <View style={styles.limitDivider} />
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Monthly Limit</Text>
          <Text style={styles.limitValue}>
            {formatCurrency(app.aggregateLimits.monthlySpendingLimit)}
          </Text>
        </View>
      </View>

      <View style={styles.mandateTypes}>
        {[...new Set(app.mandates.map(m => m.type))].map((type) => (
          <View key={type} style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{type}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshMandates} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Apps</Text>
          <Text style={styles.subtitle}>
            Manage transaction limits for your approved AI applications
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeApps.length}</Text>
            <Text style={styles.statLabel}>Active Apps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {mandates.filter(m => m.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active Mandates</Text>
          </View>
        </View>

        {/* Active Apps */}
        {activeApps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active AI Apps</Text>
            <Text style={styles.sectionSubtitle}>
              Apps with active authorization to transact on your behalf
            </Text>
            {activeApps.map((app) => renderAppCard(app))}
          </View>
        )}

        {/* Inactive Apps */}
        {inactiveApps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inactive Apps</Text>
            <Text style={styles.sectionSubtitle}>
              Previously authorized apps with no active mandates
            </Text>
            {inactiveApps.map((app) => renderAppCard(app, false))}
          </View>
        )}

        {aiApps.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>No AI Apps</Text>
            <Text style={styles.emptyText}>
              When you authorize AI apps to make purchases on your behalf, they will appear here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Limits Modal */}
      <Modal
        visible={isLimitsModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsLimitsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsLimitsModalOpen(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedApp?.agentName || 'App Settings'}
            </Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveLimits}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedApp && (
              <>
                <View style={styles.appSummary}>
                  <View style={styles.appSummaryIcon}>
                    <Text style={styles.appSummaryIconText}>
                      {selectedApp.agentName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.appSummaryInfo}>
                    <Text style={styles.appSummaryName}>{selectedApp.agentName}</Text>
                    <Text style={styles.appSummaryId}>ID: {selectedApp.agentId}</Text>
                  </View>
                </View>

                <View style={styles.mandatesSummary}>
                  <Text style={styles.mandatesSummaryTitle}>Authorization Summary</Text>
                  {selectedApp.mandates.map((mandate, idx) => (
                    <View key={idx} style={styles.mandateSummaryRow}>
                      <View style={styles.mandateSummaryType}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: getStatusColor(mandate.status) },
                          ]}
                        />
                        <Text style={styles.mandateSummaryTypeText}>
                          {mandate.type.charAt(0).toUpperCase() + mandate.type.slice(1)} Mandate
                        </Text>
                      </View>
                      <Text style={styles.mandateSummaryStatus}>{mandate.status}</Text>
                    </View>
                  ))}
                </View>

                {editingLimits && (
                  <MandateLimitsEditor
                    initialLimits={editingLimits}
                    onLimitsChange={setEditingLimits}
                    editable={true}
                  />
                )}

                <TouchableOpacity
                  style={styles.viewMandatesButton}
                  onPress={() => handleViewMandates(selectedApp)}
                >
                  <Text style={styles.viewMandatesButtonText}>
                    View All Mandates for This App
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  mandateCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mandateCountText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  appArrow: {
    padding: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  limitsPreview: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  limitItem: {
    flex: 1,
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  limitDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  mandateTypes: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D4ED8',
    textTransform: 'capitalize',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  appSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appSummaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appSummaryIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  appSummaryInfo: {
    flex: 1,
  },
  appSummaryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  appSummaryId: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  mandatesSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mandatesSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  mandateSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mandateSummaryType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  mandateSummaryTypeText: {
    fontSize: 14,
    color: '#374151',
  },
  mandateSummaryStatus: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  viewMandatesButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  viewMandatesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
