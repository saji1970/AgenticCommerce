import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { colors } from '../../theme/colors';

interface Props {
  message: ChatMessage;
  onCopy?: (text: string) => void;
}

export const AITextBubble: React.FC<Props> = ({ message, onCopy }) => {
  const { parsedQuery } = message;

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
        {parsedQuery && (parsedQuery.origin || parsedQuery.destination) && (
          <View style={styles.travelInfo}>
            {parsedQuery.origin && parsedQuery.destination && (
              <Text style={styles.travelDetail}>
                {parsedQuery.origin} → {parsedQuery.destination}
              </Text>
            )}
            {(parsedQuery.departureDate || parsedQuery.startDate) && (
              <Text style={styles.travelDetail}>
                Depart: {parsedQuery.departureDate || parsedQuery.startDate}
                {(parsedQuery.returnDate || parsedQuery.endDate) ? `  |  Return: ${parsedQuery.returnDate || parsedQuery.endDate}` : ''}
              </Text>
            )}
            {parsedQuery.passengers && (
              <Text style={styles.travelDetail}>
                {parsedQuery.passengers} passenger{parsedQuery.passengers > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
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
    backgroundColor: colors.backgroundAlt,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  travelInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  travelDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
