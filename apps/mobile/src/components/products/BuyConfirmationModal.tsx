import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Product, Mandate } from '@agentic-commerce/shared-types';
import { getConstraintSummary } from '../../utils/mandateValidation';

interface BuyConfirmationModalProps {
  visible: boolean;
  product: Product;
  mandate: Mandate;
  onConfirm: (reasoning: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const BuyConfirmationModal: React.FC<BuyConfirmationModalProps> = ({
  visible,
  product,
  mandate,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [reasoning, setReasoning] = useState('');

  const handleConfirm = () => {
    const finalReasoning = reasoning.trim() || `User requested via Buy button for ${product.name}`;
    onConfirm(finalReasoning);
  };

  const constraintsSummary = getConstraintSummary(mandate);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.title}>Confirm Purchase</Text>

            {/* Product Info */}
            <View style={styles.productSection}>
              {product.imageUrl && (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>
                  {product.price != null 
                    ? `$${product.price.toFixed(2)} ${product.currency || 'USD'}`
                    : 'Price not available'}
                </Text>
              </View>
            </View>

            {/* Agent Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Agent</Text>
              <Text style={styles.agentName}>{mandate.agentName}</Text>
              <Text style={styles.agentDescription}>
                Your shopping assistant will add this item to your cart
              </Text>
            </View>

            {/* Mandate Constraints */}
            {constraintsSummary.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mandate Limits</Text>
                {constraintsSummary.map((constraint, index) => (
                  <Text key={index} style={styles.constraint}>
                    • {constraint}
                  </Text>
                ))}
              </View>
            )}

            {/* Optional Reasoning */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason (Optional)</Text>
              <TextInput
                style={styles.reasoningInput}
                placeholder="Why are you buying this?"
                value={reasoning}
                onChangeText={setReasoning}
                multiline={true}
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* Action Buttons */}
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
                  <Text style={styles.confirmButtonText}>Add to Cart</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
  },
  constraint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reasoningInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
