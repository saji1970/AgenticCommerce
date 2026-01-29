import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';

export interface MandateLimits {
  maxTransactionAmount: number;
  dailySpendingLimit: number;
  monthlySpendingLimit: number;
  maxItemValue?: number;
  maxItemsPerDay?: number;
  requiresTwoFactor: boolean;
}

interface MandateLimitsEditorProps {
  initialLimits: Partial<MandateLimits>;
  onLimitsChange: (limits: MandateLimits) => void;
  mandateType?: string;
  editable?: boolean;
}

export const MandateLimitsEditor: React.FC<MandateLimitsEditorProps> = ({
  initialLimits,
  onLimitsChange,
  mandateType = 'payment',
  editable = true,
}) => {
  const [limits, setLimits] = useState<MandateLimits>({
    maxTransactionAmount: initialLimits.maxTransactionAmount || 500,
    dailySpendingLimit: initialLimits.dailySpendingLimit || 1000,
    monthlySpendingLimit: initialLimits.monthlySpendingLimit || 5000,
    maxItemValue: initialLimits.maxItemValue || 200,
    maxItemsPerDay: initialLimits.maxItemsPerDay || 10,
    requiresTwoFactor: initialLimits.requiresTwoFactor ?? true,
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    onLimitsChange(limits);
  }, [limits]);

  const handleLimitChange = (key: keyof MandateLimits, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setLimits(prev => ({ ...prev, [key]: value }));
    } else {
      const numValue = parseFloat(value) || 0;
      setLimits(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  const presetAmounts = [100, 250, 500, 1000, 2500, 5000];

  const renderAmountInput = (
    label: string,
    key: keyof MandateLimits,
    value: number,
    description?: string
  ) => {
    if (!editable && !isEditing) {
      return (
        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>{label}:</Text>
          <Text style={styles.readOnlyValue}>{formatCurrency(value)}</Text>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {description && <Text style={styles.inputDescription}>{description}</Text>}
        <View style={styles.amountInputRow}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={value.toString()}
            onChangeText={(text) => handleLimitChange(key, text)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={styles.presetRow}>
          {presetAmounts.slice(0, 4).map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.presetButton,
                value === amount && styles.presetButtonActive,
              ]}
              onPress={() => handleLimitChange(key, amount.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  value === amount && styles.presetButtonTextActive,
                ]}
              >
                ${amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderNumberInput = (
    label: string,
    key: keyof MandateLimits,
    value: number,
    description?: string
  ) => {
    if (!editable && !isEditing) {
      return (
        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>{label}:</Text>
          <Text style={styles.readOnlyValue}>{value}</Text>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {description && <Text style={styles.inputDescription}>{description}</Text>}
        <TextInput
          style={styles.numberInput}
          value={value.toString()}
          onChangeText={(text) => handleLimitChange(key, text)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>AI Agent Spending Limits</Text>
        {editable && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(editable || isEditing) && (
        <Text style={styles.helperText}>
          Set the maximum amounts the AI agent can spend on your behalf
        </Text>
      )}

      <View style={styles.limitsContainer}>
        {renderAmountInput(
          'Max Per Transaction',
          'maxTransactionAmount',
          limits.maxTransactionAmount,
          'Maximum amount for a single purchase'
        )}

        {renderAmountInput(
          'Daily Spending Limit',
          'dailySpendingLimit',
          limits.dailySpendingLimit,
          'Maximum total spending per day'
        )}

        {renderAmountInput(
          'Monthly Spending Limit',
          'monthlySpendingLimit',
          limits.monthlySpendingLimit,
          'Maximum total spending per month'
        )}

        {(mandateType === 'cart' || mandateType === 'intent') && (
          <>
            {renderAmountInput(
              'Max Item Value',
              'maxItemValue',
              limits.maxItemValue || 200,
              'Maximum price per individual item'
            )}

            {renderNumberInput(
              'Max Items Per Day',
              'maxItemsPerDay',
              limits.maxItemsPerDay || 10,
              'Maximum number of items that can be added per day'
            )}
          </>
        )}

        {/* Two-Factor Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Require Two-Factor</Text>
            <Text style={styles.toggleDescription}>
              Require biometric verification for each transaction
            </Text>
          </View>
          <Switch
            value={limits.requiresTwoFactor}
            onValueChange={(value) => handleLimitChange('requiresTwoFactor', value)}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={limits.requiresTwoFactor ? '#2563EB' : '#F3F4F6'}
            disabled={!editable && !isEditing}
          />
        </View>
      </View>

      {/* Summary Box */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Authorization Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Per transaction:</Text>
          <Text style={styles.summaryValue}>Up to {formatCurrency(limits.maxTransactionAmount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Daily maximum:</Text>
          <Text style={styles.summaryValue}>Up to {formatCurrency(limits.dailySpendingLimit)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monthly maximum:</Text>
          <Text style={styles.summaryValue}>Up to {formatCurrency(limits.monthlySpendingLimit)}</Text>
        </View>
        {limits.requiresTwoFactor && (
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>Biometric required for each transaction</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  limitsContainer: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 12,
  },
  numberInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#2563EB',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  readOnlyLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
});
