import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { CartItem } from '@agentic-commerce/shared-types';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  const variantPrice = item.variants?.reduce((sum, v) => sum + (v.priceModifier || 0), 0) || 0;
  const itemPrice = item.price + variantPrice;
  const totalPrice = itemPrice * item.quantity;

  return (
    <View style={styles.container}>
      {item.productImage && (
        <Image source={{ uri: item.productImage }} style={styles.image} />
      )}
      <View style={styles.content}>
        <Text style={styles.name}>{item.productName}</Text>

        {item.variants && item.variants.length > 0 && (
          <View style={styles.variants}>
            {item.variants.map((variant, index) => (
              <Text key={index} style={styles.variant}>
                {variant.name}: {variant.value}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.price}>${itemPrice.toFixed(2)} each</Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.quantity}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>

          <Text style={styles.total}>${totalPrice.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(item.id)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  variants: {
    marginBottom: 4,
  },
  variant: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginLeft: 'auto',
  },
  removeButton: {
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
});
