import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../../types/chat';

interface Props {
  message: ChatMessage;
}

export const UserMessageBubble: React.FC<Props> = ({ message }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{message.text}</Text>
      </View>
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
