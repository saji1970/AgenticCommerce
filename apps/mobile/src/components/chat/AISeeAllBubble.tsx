import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChatMessage } from '../../types/chat';
import { colors } from '../../theme/colors';

interface Props {
  message: ChatMessage;
}

export const AISeeAllBubble: React.FC<Props> = ({ message }) => {
  const navigation = useNavigation<any>();
  const count = message.allProducts?.length || 0;

  const handlePress = () => {
    navigation.navigate('Products', {
      screen: 'ProductList',
      params: { searchQueryId: message.searchQueryId || 'chat' },
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Compare all {count} options</Text>
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
  button: {
    backgroundColor: colors.action,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
