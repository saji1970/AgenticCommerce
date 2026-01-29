import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MandateLimitsEditor, MandateLimits } from '../components/MandateLimitsEditor';

const DEFAULT_LIMITS_KEY = 'default_spending_limits';

const INITIAL_DEFAULTS: MandateLimits = {
  maxTransactionAmount: 500,
  dailySpendingLimit: 1000,
  monthlySpendingLimit: 5000,
  maxItemValue: 200,
  maxItemsPerDay: 10,
  requiresTwoFactor: true,
};

export const DefaultLimitsScreen: React.FC = () => {
  const [limits, setLimits] = useState<MandateLimits>(INITIAL_DEFAULTS);
  const [originalLimits, setOriginalLimits] = useState<MandateLimits>(INITIAL_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadDefaultLimits();
  }, []);

  useEffect(() => {
    // Check if limits have changed from original
    const changed = JSON.stringify(limits) !== JSON.stringify(originalLimits);
    setHasChanges(changed);
  }, [limits, originalLimits]);

  const loadDefaultLimits = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(DEFAULT_LIMITS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLimits(parsed);
        setOriginalLimits(parsed);
      }
    } catch (error) {
      console.error('Error loading default limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(DEFAULT_LIMITS_KEY, JSON.stringify(limits));
      setOriginalLimits(limits);
      Alert.alert(
        'Success',
        'Default spending limits have been updated. New mandates will use these limits.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save default limits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all limits to the system defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLimits(INITIAL_DEFAULTS);
            await AsyncStorage.setItem(DEFAULT_LIMITS_KEY, JSON.stringify(INITIAL_DEFAULTS));
            setOriginalLimits(INITIAL_DEFAULTS);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Default Spending Limits</Text>
        <Text style={styles.subtitle}>
          Set default limits for new AI app authorizations. These limits will be applied
          when you approve new mandates.
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How defaults work</Text>
            <Text style={styles.infoText}>
              These limits are used as starting values when you approve new AI app mandates.
              You can adjust limits for individual apps in the AI Apps section.
            </Text>
          </View>
        </View>

        <MandateLimitsEditor
          initialLimits={limits}
          onLimitsChange={setLimits}
          editable={true}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Default Limits</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>Reset to System Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Security Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Start with lower limits and increase as needed
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Enable two-factor authentication for extra security
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Review your AI app transactions regularly
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Revoke mandates for apps you no longer use
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#2563EB',
    marginRight: 8,
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
