import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { useProduct } from '../../hooks/useProduct';

interface Props {
  message: ChatMessage;
}

export const AIMandateBubble: React.FC<Props> = ({ message }) => {
  const { performNLPSearch } = useProduct();
  const [creating, setCreating] = useState(false);
  const [mandate, setMandate] = useState(message.mandateCreated || null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateMandate = async () => {
    if (!message.originalQuery) return;
    setCreating(true);
    setError(null);
    try {
      const result = await performNLPSearch(message.originalQuery, true);
      if (result.mandateCreated) {
        setMandate(result.mandateCreated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create mandate');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.header}>Smart Purchase Intent Detected</Text>

        {message.intentCreated && (
          <View style={styles.intentInfo}>
            <Text style={styles.intentType}>
              Type: {message.intentCreated.type.replace('_', ' ').toUpperCase()}
            </Text>
            {message.intentCreated.reasoning && (
              <Text style={styles.intentReasoning}>{message.intentCreated.reasoning}</Text>
            )}
          </View>
        )}

        {mandate ? (
          <View style={styles.mandateInfo}>
            <Text style={styles.mandateHeader}>Mandate Created</Text>
            <Text style={styles.mandateDetail}>
              Status: {mandate.status.toUpperCase()}
            </Text>
            <Text style={styles.mandateDetail}>
              Max Value: ${mandate.constraints.maxIntentValue ?? 'N/A'}
            </Text>
            <Text style={styles.mandateDetail}>
              Auto-approve under: ${mandate.constraints.autoApproveUnder ?? 'N/A'}
            </Text>
            <Text style={styles.mandateDetail}>
              Max intents/day: {mandate.constraints.maxIntentsPerDay ?? 'N/A'}
            </Text>
          </View>
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.button, creating && styles.buttonDisabled]}
              onPress={handleCreateMandate}
              activeOpacity={0.7}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Mandate</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  bubble: {
    backgroundColor: '#F0F7FF',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  header: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  intentInfo: {
    marginBottom: 10,
  },
  intentType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  intentReasoning: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  mandateInfo: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  mandateHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  mandateDetail: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    minWidth: 130,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 8,
  },
});
