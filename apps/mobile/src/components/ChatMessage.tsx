import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Avatar, Chip } from 'react-native-paper';
import { ChatMessage as ChatMessageType, Product } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const products = message.metadata?.products || [];

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.messageRow, isUser && styles.userRow]}>
        {!isUser && (
          <Avatar.Icon
            size={32}
            icon="robot"
            style={styles.avatar}
          />
        )}
        <Card
          style={[
            styles.messageCard,
            isUser ? styles.userCard : styles.assistantCard,
          ]}
        >
          <Card.Content>
            <Text style={[styles.messageText, isUser && styles.userText]}>
              {message.content}
            </Text>
            
            {products.length > 0 && (
              <View style={styles.productsContainer}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
        {isUser && (
          <Avatar.Icon
            size={32}
            icon="account"
            style={styles.avatar}
          />
        )}
      </View>
    </View>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <Card style={styles.productCard}>
      <Card.Content>
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.productDetails}>
          <Chip icon="store" style={styles.storeChip}>
            {product.store}
          </Chip>
          <Text style={styles.productPrice}>
            ${product.price.toFixed(2)} {product.currency}
          </Text>
        </View>
        {product.availability && (
          <Chip
            icon={product.availability === 'in_stock' ? 'check-circle' : 'alert-circle'}
            style={[
              styles.availabilityChip,
              product.availability === 'in_stock' && styles.inStockChip,
            ]}
          >
            {product.availability.replace('_', ' ')}
          </Chip>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  userRow: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    marginHorizontal: 8,
    backgroundColor: '#6200EE',
  },
  messageCard: {
    flex: 1,
    elevation: 2,
  },
  userCard: {
    backgroundColor: '#6200EE',
  },
  assistantCard: {
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
  },
  userText: {
    color: '#FFF',
  },
  productsContainer: {
    marginTop: 12,
    gap: 8,
  },
  productCard: {
    marginTop: 8,
    backgroundColor: '#FFF',
    elevation: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  storeChip: {
    height: 28,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  availabilityChip: {
    height: 24,
    marginTop: 4,
  },
  inStockChip: {
    backgroundColor: '#4CAF50',
  },
});

