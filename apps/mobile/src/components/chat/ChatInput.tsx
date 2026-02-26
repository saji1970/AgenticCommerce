import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const { transcript, isListening, error, startListening, stopListening } =
    useVoiceInput();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Feed live transcript into the text input
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  // Pulse animation while listening
  useEffect(() => {
    if (isListening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleMicPress = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  return (
    <View style={styles.container}>
      {isListening && (
        <Text style={styles.listeningLabel}>Listening...</Text>
      )}
      {error && <Text style={styles.errorLabel}>{error}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask me anything..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
          editable={!disabled}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Animated.View style={{ opacity: pulseAnim }}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
            ]}
            onPress={handleMicPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  listeningLabel: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  errorLabel: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    maxHeight: 100,
    color: '#1F2937',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FEE2E2',
  },
  micIcon: {
    fontSize: 18,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
  },
});
