import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMandates } from '../contexts/MandateContext';
import { AgentMandate } from '../services/mandate-service.client';

export const MandatesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { mandates, loading, refreshMandates } = useMandates();
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'revoked'>('all');

  useEffect(() => {
    refreshMandates();
  }, []);

  const filteredMandates = filter === 'all'
    ? mandates
    : mandates.filter(m => m.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'active': return '#10B981';
      case 'revoked': return '#EF4444';
      case 'suspended': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const renderMandate = ({ item }: { item: AgentMandate }) => (
    <TouchableOpacity
      style={styles.mandateCard}
      onPress={() => navigation.navigate('MandateDetail' as never, { mandateId: item.id } as never)}
    >
      <View style={styles.mandateHeader}>
        <Text style={styles.mandateAgent}>{item.agentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.mandateType}>Type: {item.type}</Text>
      <Text style={styles.mandateDate}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'active', 'revoked'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMandates}
        renderItem={renderMandate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshMandates} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No mandates found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  mandateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mandateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mandateAgent: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mandateType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  mandateDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
