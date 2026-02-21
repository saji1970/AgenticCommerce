import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../../types/chat';

interface Props {
  message: ChatMessage;
}

export const AITextBubble: React.FC<Props> = ({ message }) => {
  const { parsedQuery } = message;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{message.text}</Text>
        {parsedQuery && (parsedQuery.origin || parsedQuery.destination) && (
          <View style={styles.travelInfo}>
            {parsedQuery.origin && parsedQuery.destination && (
              <Text style={styles.travelDetail}>
                {parsedQuery.origin} → {parsedQuery.destination}
              </Text>
            )}
            {parsedQuery.departureDate && (
              <Text style={styles.travelDetail}>
                Depart: {parsedQuery.departureDate}
                {parsedQuery.returnDate ? `  |  Return: ${parsedQuery.returnDate}` : ''}
              </Text>
            )}
            {parsedQuery.passengers && (
              <Text style={styles.travelDetail}>
                {parsedQuery.passengers} passenger{parsedQuery.passengers > 1 ? 's' : ''}
              </Text>
            )}
          </View>
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
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  text: {
    color: '#1F2937',
    fontSize: 16,
    lineHeight: 22,
  },
  travelInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  travelDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
