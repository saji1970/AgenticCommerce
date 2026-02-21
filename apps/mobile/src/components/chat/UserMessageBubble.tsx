import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChatMessage } from '../../types/chat';

interface Props {
  message: ChatMessage;
  onCopy?: (text: string) => void;
}

export const UserMessageBubble: React.FC<Props> = ({ message, onCopy }) => {
  const handleLongPress = () => {
    if (message.text && onCopy) {
      onCopy(message.text);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.bubble}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        delayLongPress={400}
      >
        <Text style={styles.text}>{message.text}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  bubble: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
});
