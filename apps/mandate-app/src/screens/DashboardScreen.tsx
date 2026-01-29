import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useMandates } from '../contexts/MandateContext';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { mandates, loading, refreshMandates } = useMandates();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  useEffect(() => {
    refreshMandates();
  }, []);

  const pendingMandates = mandates.filter(m => m.status === 'pending');
  const activeMandates = mandates.filter(m => m.status === 'active');
  const revokedMandates = mandates.filter(m => m.status === 'revoked');

  // Get unique AI apps with active mandates
  const activeAIApps = useMemo(() => {
    const appMap = new Map<string, { name: string; count: number }>();
    activeMandates.forEach((mandate) => {
      const existing = appMap.get(mandate.agentId);
      if (existing) {
        existing.count++;
      } else {
        appMap.set(mandate.agentId, { name: mandate.agentName, count: 1 });
      }
    });
    return Array.from(appMap.values());
  }, [activeMandates]);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  // Calculate total spending limits across all active mandates
  const totalLimits = useMemo(() => {
    let daily = 0;
    let monthly = 0;
    activeMandates.forEach((mandate) => {
      daily += mandate.constraints?.dailySpendingLimit || mandate.constraints?.dailyLimit || 0;
      monthly += mandate.constraints?.monthlySpendingLimit || mandate.constraints?.monthlyLimit || 0;
    });
    return { daily, monthly };
  }, [activeMandates]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refreshMandates} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || user?.id || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statNumberPrimary}>{activeAIApps.length}</Text>
          <Text style={styles.statLabelPrimary}>Active AI Apps</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeMandates.length}</Text>
          <Text style={styles.statLabel}>Active Mandates</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, pendingMandates.length > 0 && styles.statNumberWarning]}>
            {pendingMandates.length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Total Spending Limits Summary */}
      {activeMandates.length > 0 && (
        <View style={styles.limitsCard}>
          <Text style={styles.limitsTitle}>Combined Spending Limits</Text>
          <View style={styles.limitsRow}>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Daily Limit</Text>
              <Text style={styles.limitValue}>{formatCurrency(totalLimits.daily)}</Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Monthly Limit</Text>
              <Text style={styles.limitValue}>{formatCurrency(totalLimits.monthly)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.manageLimitsButton}
            onPress={() => (navigation as any).navigate('Settings', { screen: 'DefaultLimits' })}
          >
            <Text style={styles.manageLimitsText}>Manage Default Limits</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('AIApps')}
          >
            <Text style={styles.actionIcon}>🤖</Text>
            <Text style={styles.actionLabel}>Manage AI Apps</Text>
            <Text style={styles.actionDescription}>
              View and configure app limits
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('Mandates')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>View Mandates</Text>
            <Text style={styles.actionDescription}>
              Review all authorizations
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active AI Apps */}
      {activeAIApps.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active AI Apps</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('AIApps')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {activeAIApps.slice(0, 3).map((app, index) => (
            <TouchableOpacity
              key={index}
              style={styles.appCard}
              onPress={() => (navigation as any).navigate('AIApps')}
            >
              <View style={styles.appIcon}>
                <Text style={styles.appIconText}>{app.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appMandates}>
                  {app.count} active mandate{app.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.appStatus}>
                <View style={styles.activeIndicator} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Pending Mandates */}
      {pendingMandates.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Mandates')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pendingAlert}>
            <Text style={styles.pendingAlertIcon}>⚠️</Text>
            <Text style={styles.pendingAlertText}>
              You have {pendingMandates.length} mandate{pendingMandates.length !== 1 ? 's' : ''} waiting for approval
            </Text>
          </View>
          {pendingMandates.slice(0, 2).map((mandate) => (
            <TouchableOpacity
              key={mandate.id}
              style={styles.mandateCard}
              onPress={() => (navigation as any).navigate('Mandates', { screen: 'MandateDetail', params: { mandateId: mandate.id } })}
            >
              <View style={styles.mandateInfo}>
                <Text style={styles.mandateAgent}>{mandate.agentName}</Text>
                <Text style={styles.mandateType}>{mandate.type} mandate</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty State */}
      {mandates.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.emptyTitle}>No AI Apps Yet</Text>
          <Text style={styles.emptyText}>
            When AI apps request authorization to make purchases on your behalf, they will appear here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#2563EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#93C5FD',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardPrimary: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statNumberPrimary: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statNumberWarning: {
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statLabelPrimary: {
    fontSize: 12,
    color: '#4F46E5',
  },
  limitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  limitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  limitsRow: {
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
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  limitDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  manageLimitsButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  manageLimitsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  quickActions: {
    padding: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 18,
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
    marginBottom: 2,
  },
  appMandates: {
    fontSize: 13,
    color: '#6B7280',
  },
  appStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingAlertIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pendingAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  mandateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mandateInfo: {
    flex: 1,
  },
  mandateAgent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  mandateType: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
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
});
