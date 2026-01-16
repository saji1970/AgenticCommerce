import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Product, Mandate } from '@agentic-commerce/shared-types';
import { IntentType, IntentConditions } from '../../types/intent.types';
import { generateIntentReasoning, validateIntentConditions } from '../../utils/intentReasoning';
import DateTimePicker from '@react-native-community/datetimepicker';

interface IntentCreationModalProps {
  visible: boolean;
  product: Product;
  mandate?: Mandate;
  onConfirm: (reasoning: string, conditions: IntentConditions) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const INTENT_TYPES = [
  { type: IntentType.PRICE_DROP, label: 'Price Drop Alert', icon: '💰' },
  { type: IntentType.AVAILABILITY, label: 'Back in Stock', icon: '📦' },
  { type: IntentType.TIME_BASED, label: 'Scheduled Purchase', icon: '⏰' },
  { type: IntentType.GENERAL, label: "I'm Interested", icon: '⭐' },
];

export const IntentCreationModal: React.FC<IntentCreationModalProps> = ({
  visible,
  product,
  mandate,
  onConfirm,
  onCancel,
  loading,
}) => {
  const [selectedType, setSelectedType] = useState<IntentType>(IntentType.PRICE_DROP);
  const [conditions, setConditions] = useState<IntentConditions>({ type: IntentType.PRICE_DROP });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleTypeSelect = (type: IntentType) => {
    setSelectedType(type);
    setConditions({ type });
    setErrors({});
  };

  const handleConfirm = async () => {
    const validation = validateIntentConditions(selectedType, conditions, product);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const reasoning = generateIntentReasoning(selectedType, product, conditions);
    await onConfirm(reasoning, conditions);
  };

  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={styles.label}>Intent Type</Text>
      {INTENT_TYPES.map(({ type, label, icon }) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.typeOption,
            selectedType === type && styles.typeOptionSelected,
          ]}
          onPress={() => handleTypeSelect(type)}
        >
          <Text style={styles.typeIcon}>{icon}</Text>
          <Text style={[
            styles.typeLabel,
            selectedType === type && styles.typeLabelSelected,
          ]}>
            {label}
          </Text>
          {selectedType === type && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPriceDropForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Current Price</Text>
      <Text style={styles.currentPrice}>
        {product.price != null
          ? `${product.currency || 'USD'} ${product.price.toFixed(2)}`
          : 'Price not available'}
      </Text>

      <Text style={styles.label}>Target Price *</Text>
      <TextInput
        style={[styles.input, errors.targetPrice && styles.inputError]}
        placeholder="Enter target price"
        keyboardType="numeric"
        value={conditions.targetPrice?.toString() || ''}
        onChangeText={(text) => {
          const price = parseFloat(text) || 0;
          setConditions({ ...conditions, targetPrice: price });
          if (errors.targetPrice) {
            setErrors({ ...errors, targetPrice: '' });
          }
        }}
      />
      {errors.targetPrice && (
        <Text style={styles.errorText}>{errors.targetPrice}</Text>
      )}

      {conditions.targetPrice && product.price != null && conditions.targetPrice < product.price && (
        <Text style={styles.helperText}>
          💡 {((1 - conditions.targetPrice / product.price) * 100).toFixed(1)}% price drop
        </Text>
      )}
    </View>
  );

  const renderAvailabilityForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.infoText}>
        📦 You'll be notified when this product becomes available for purchase.
      </Text>
      {product.rawData?.availability && (
        <View style={styles.availabilityStatus}>
          <Text style={styles.label}>Current Status:</Text>
          <Text style={styles.statusText}>{product.rawData.availability}</Text>
        </View>
      )}
    </View>
  );

  const renderTimeBasedForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Schedule Purchase Date *</Text>

      <TouchableOpacity
        style={[styles.dateButton, errors.scheduledDate && styles.inputError]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateButtonText}>
          {conditions.scheduledDate
            ? new Date(conditions.scheduledDate).toLocaleDateString()
            : 'Select Date'}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {errors.scheduledDate && (
        <Text style={styles.errorText}>{errors.scheduledDate}</Text>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={conditions.scheduledDate ? new Date(conditions.scheduledDate) : new Date()}
          mode="date"
          display="default"
          minimumDate={new Date(Date.now() + 86400000)} // Tomorrow
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setConditions({ ...conditions, scheduledDate: selectedDate });
              if (errors.scheduledDate) {
                setErrors({ ...errors, scheduledDate: '' });
              }
            }
          }}
        />
      )}

      <Text style={styles.helperText}>
        ⏰ Purchase will be scheduled for the selected date
      </Text>
    </View>
  );

  const renderGeneralForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Why are you interested? (Optional)</Text>
      <TextInput
        style={[styles.textArea]}
        placeholder="E.g., Waiting for a sale, comparing options, etc."
        multiline={true}
        numberOfLines={4}
        value={conditions.customReasoning || ''}
        onChangeText={(text) => {
          setConditions({ ...conditions, customReasoning: text });
        }}
      />
      <Text style={styles.helperText}>
        ⭐ We'll keep track of your interest in this product
      </Text>
    </View>
  );

  const renderForm = () => {
    switch (selectedType) {
      case IntentType.PRICE_DROP:
        return renderPriceDropForm();
      case IntentType.AVAILABILITY:
        return renderAvailabilityForm();
      case IntentType.TIME_BASED:
        return renderTimeBasedForm();
      case IntentType.GENERAL:
        return renderGeneralForm();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView>
            <Text style={styles.title}>Create Purchase Intent</Text>

            {/* Product Summary */}
            <View style={styles.productSummary}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>
                {product.price != null
                  ? `${product.currency || 'USD'} ${product.price.toFixed(2)}`
                  : 'Price not available'}
              </Text>
            </View>

            {/* Type Selector */}
            {renderTypeSelector()}

            {/* Dynamic Form */}
            {renderForm()}

            {/* Mandate Info */}
            {mandate && (
              <View style={styles.mandateInfo}>
                <Text style={styles.mandateLabel}>📋 Intent Mandate Active</Text>
                <Text style={styles.mandateText}>
                  Daily limit: {(mandate.constraints as any).maxIntentsPerDay || 20} intents
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Create Intent</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  productSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  typeSelectorContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007AFF',
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  typeLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
  },
  formContainer: {
    marginBottom: 20,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#495057',
  },
  calendarIcon: {
    fontSize: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 12,
  },
  availabilityStatus: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  mandateInfo: {
    backgroundColor: '#e7f3ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  mandateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  mandateText: {
    fontSize: 12,
    color: '#495057',
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
