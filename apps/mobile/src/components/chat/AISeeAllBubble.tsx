import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChatMessage } from '../../types/chat';

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
        <Text style={styles.buttonText}>See all {count} results</Text>
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
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
