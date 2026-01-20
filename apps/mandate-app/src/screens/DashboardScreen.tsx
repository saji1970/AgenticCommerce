import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useMandates } from '../contexts/MandateContext';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { mandates, loading, refreshMandates } = useMandates();

  useEffect(() => {
    refreshMandates();
  }, []);

  const pendingMandates = mandates.filter(m => m.status === 'pending');
  const activeMandates = mandates.filter(m => m.status === 'active');
  const revokedMandates = mandates.filter(m => m.status === 'revoked');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refreshMandates} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {user?.name || user?.id || 'User'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingMandates.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeMandates.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{revokedMandates.length}</Text>
          <Text style={styles.statLabel}>Revoked</Text>
        </View>
      </View>

      {pendingMandates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Mandates</Text>
          {pendingMandates.slice(0, 3).map((mandate) => (
            <TouchableOpacity
              key={mandate.id}
              style={styles.mandateCard}
              onPress={() => (navigation as any).navigate('Mandates', { screen: 'MandateDetail', params: { mandateId: mandate.id } })}
            >
              <Text style={styles.mandateAgent}>{mandate.agentName}</Text>
              <Text style={styles.mandateType}>{mandate.type}</Text>
              <Text style={styles.mandateStatus}>{mandate.status}</Text>
            </TouchableOpacity>
          ))}
          {pendingMandates.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => (navigation as any).navigate('Mandates')}
            >
              <Text style={styles.viewAllText}>View All ({pendingMandates.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeMandates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Mandates</Text>
          {activeMandates.slice(0, 3).map((mandate) => (
            <TouchableOpacity
              key={mandate.id}
              style={styles.mandateCard}
              onPress={() => (navigation as any).navigate('Mandates', { screen: 'MandateDetail', params: { mandateId: mandate.id } })}
            >
              <Text style={styles.mandateAgent}>{mandate.agentName}</Text>
              <Text style={styles.mandateType}>{mandate.type}</Text>
              <Text style={styles.mandateStatus}>{mandate.status}</Text>
            </TouchableOpacity>
          ))}
          {activeMandates.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Mandates' as never)}
            >
              <Text style={styles.viewAllText}>View All ({activeMandates.length})</Text>
            </TouchableOpacity>
          )}
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
    marginBottom: 12,
  },
  mandateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mandateAgent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  mandateType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  mandateStatus: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  viewAllButton: {
    padding: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
