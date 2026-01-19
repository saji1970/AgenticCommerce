import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { AIAgentApp, CreateAgentAppRequest } from '../services/mandate-service.client';
import { mandateServiceClient } from '../services/mandate-service.client';

export const AgentsScreen: React.FC = () => {
  const [agents, setAgents] = useState<AIAgentApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState<CreateAgentAppRequest>({
    name: '',
    slug: '',
    agentId: '',
    agentName: '',
    capabilities: [],
    description: '',
  });
  const [capabilityInput, setCapabilityInput] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await mandateServiceClient.getAllAgentApps();
      setAgents(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCapability = () => {
    if (capabilityInput.trim()) {
      setFormData({
        ...formData,
        capabilities: [...formData.capabilities, capabilityInput.trim()],
      });
      setCapabilityInput('');
    }
  };

  const handleRemoveCapability = (index: number) => {
    setFormData({
      ...formData,
      capabilities: formData.capabilities.filter((_, i) => i !== index),
    });
  };

  const handleAddAgent = async () => {
    if (!formData.name || !formData.slug || !formData.agentId || !formData.agentName) {
      Alert.alert('Error', 'Name, slug, agent ID, and agent name are required');
      return;
    }

    setAdding(true);
    try {
      await mandateServiceClient.createAgentApp(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        slug: '',
        agentId: '',
        agentName: '',
        capabilities: [],
        description: '',
      });
      await loadAgents();
      Alert.alert('Success', 'Agent added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add agent');
    } finally {
      setAdding(false);
    }
  };

  const renderAgent = ({ item }: { item: AIAgentApp }) => (
    <View style={styles.agentCard}>
      <Text style={styles.agentName}>{item.name}</Text>
      <Text style={styles.agentId}>Agent: {item.agentName} ({item.agentId})</Text>
      <Text style={styles.agentSlug}>{item.slug}</Text>
      {item.description && (
        <Text style={styles.agentDescription}>{item.description}</Text>
      )}
      {item.capabilities.length > 0 && (
        <View style={styles.capabilitiesContainer}>
          {item.capabilities.map((cap, index) => (
            <View key={index} style={styles.capabilityBadge}>
              <Text style={styles.capabilityText}>{cap}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#10B981' : '#6B7280' }]}>
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Agents</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={agents}
        renderItem={renderAgent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadAgents} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No agents found</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add AI Agent</Text>
            
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Agent app name"
            />

            <Text style={styles.label}>Slug *</Text>
            <TextInput
              style={styles.input}
              value={formData.slug}
              onChangeText={(text) => setFormData({ ...formData, slug: text })}
              placeholder="agent-slug"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Agent ID *</Text>
            <TextInput
              style={styles.input}
              value={formData.agentId}
              onChangeText={(text) => setFormData({ ...formData, agentId: text })}
              placeholder="agent-id"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Agent Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.agentName}
              onChangeText={(text) => setFormData({ ...formData, agentName: text })}
              placeholder="Agent display name"
            />

            <Text style={styles.label}>Capabilities</Text>
            <View style={styles.capabilityInputContainer}>
              <TextInput
                style={[styles.input, styles.capabilityInput]}
                value={capabilityInput}
                onChangeText={setCapabilityInput}
                placeholder="Add capability"
                onSubmitEditing={handleAddCapability}
              />
              <TouchableOpacity
                style={styles.addCapabilityButton}
                onPress={handleAddCapability}
              >
                <Text style={styles.addCapabilityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            {formData.capabilities.length > 0 && (
              <View style={styles.capabilitiesList}>
                {formData.capabilities.map((cap, index) => (
                  <View key={index} style={styles.capabilityItem}>
                    <Text style={styles.capabilityItemText}>{cap}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCapability(index)}>
                      <Text style={styles.removeCapabilityText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Agent description"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddAgent}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  agentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  agentId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  agentSlug: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  agentDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  capabilityBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capabilityText: {
    fontSize: 12,
    color: '#2563EB',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
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
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  capabilityInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  capabilityInput: {
    flex: 1,
  },
  addCapabilityButton: {
    backgroundColor: '#2563EB',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCapabilityButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  capabilitiesList: {
    marginTop: 8,
    gap: 8,
  },
  capabilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
  },
  capabilityItemText: {
    fontSize: 14,
    color: '#374151',
  },
  removeCapabilityText: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
