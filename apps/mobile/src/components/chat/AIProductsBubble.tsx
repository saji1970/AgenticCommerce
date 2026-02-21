import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Product } from '@agentic-commerce/shared-types';
import { ProductCard } from '../products/ProductCard';
import { ChatMessage } from '../../types/chat';

interface Props {
  message: ChatMessage;
}

export const AIProductsBubble: React.FC<Props> = ({ message }) => {
  const navigation = useNavigation<any>();
  const products = message.products || [];

  const handleProductPress = (product: Product) => {
    navigation.navigate('Products', {
      screen: 'ProductDetails',
      params: { productId: product.id },
    });
  };

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onPress={() => handleProductPress(product)}
          compact
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
});
