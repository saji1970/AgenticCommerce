import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card } from 'react-native-paper';

const OrdersScreen: React.FC = () => {
  // TODO: Fetch orders from API
  const orders: any[] = [];

  const renderOrder = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{item.id || 'Order #12345'}</Text>
        <Text variant="bodyMedium">Status: {item.status || 'Pending'}</Text>
        <Text variant="bodySmall">Total: ${item.total || '0.00'}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="headlineSmall" style={styles.emptyText}>
            No orders yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Your order history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    color: '#999',
    textAlign: 'center',
  },
});

export default OrdersScreen;

