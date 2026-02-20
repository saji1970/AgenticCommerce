import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMandate } from '../../contexts/MandateContext';
import { mandateServiceClient } from '../../services/mandate-service.client';
import { storageService } from '../../services/storage.service';
import { AppConfig } from '../../config/app.config';
import { openMandateApp } from '../../utils/deepLink';
import { MandateType } from '@agentic-commerce/shared-types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export const AppMandateSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { loadMandates } = useMandate();
  const [loading, setLoading] = useState(false);

  // Purchase limits
  const [maxTransaction, setMaxTransaction] = useState('500');
  const [dailyLimit, setDailyLimit] = useState('1000');
  const [monthlyLimit, setMonthlyLimit] = useState('5000');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(true);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const user = await storageService.getUser();
      if (!user || !user.id) {
        Alert.alert('Error', 'Please log in first.');
        return;
      }

      const defaultAgent = AppConfig.getDefaultAgent();

      const constraints = {
        maxTransactionAmount: parseFloat(maxTransaction) || 500,
        dailySpendingLimit: parseFloat(dailyLimit) || 1000,
        monthlySpendingLimit: parseFloat(monthlyLimit) || 5000,
        requiresTwoFactor,
      };

      // Register app mandate
      const pendingMandate = await mandateServiceClient.registerMandate({
        userId: user.id,
        agentId: defaultAgent.id,
        agentName: defaultAgent.name,
        type: 'app',
        constraints,
      });

      console.log('[AppMandateSetup] Registered app mandate:', pendingMandate.id);

      // Try to open mandate app for approval
      const opened = await openMandateApp(pendingMandate.id, {
        userId: user.id,
        userName: user.name,
      });

      if (!opened) {
        // Mandate app not available - auto-approve
        console.log('[AppMandateSetup] Mandate app not available, auto-approving');
        const result = await mandateServiceClient.approveMandate(pendingMandate.id, user.id);
        if (result.mandateToken) {
          await AsyncStorage.setItem(`mandate_token_${pendingMandate.id}`, result.mandateToken);
        }
        await loadMandates();
        Alert.alert('App Mandate Active', 'Your AI agent has been registered with your purchase limits.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Approve in Mandate App', 'Please approve the app mandate in the Mandate Manager app, then return here.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('[AppMandateSetup] Error:', error);
      Alert.alert('Error', error.message || 'Failed to create app mandate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Register AI Agent</Text>
      <Text style={styles.subtitle}>
        Set purchase limits for your AI shopping agent. This master authorization
        controls all future cart, intent, and payment operations.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Purchase Limits</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Max Per Transaction ($)</Text>
          <TextInput
            style={styles.input}
            value={maxTransaction}
            onChangeText={setMaxTransaction}
            keyboardType="numeric"
            placeholder="500"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Daily Spending Limit ($)</Text>
          <TextInput
            style={styles.input}
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="numeric"
            placeholder="1000"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Monthly Spending Limit ($)</Text>
          <TextInput
            style={styles.input}
            value={monthlyLimit}
            onChangeText={setMonthlyLimit}
            keyboardType="numeric"
            placeholder="5000"
          />
        </View>

        <View style={styles.switchField}>
          <Text style={styles.label}>Require Two-Factor for High Value</Text>
          <Switch value={requiresTwoFactor} onValueChange={setRequiresTwoFactor} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Register AI Agent</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
