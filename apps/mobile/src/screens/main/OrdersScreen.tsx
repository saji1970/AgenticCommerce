import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';

const OrdersScreen: React.FC = () => {
  const orders: any[] = [];

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        My Orders
      </Text>
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">No orders yet</Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Start shopping with your AI agent
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title title={item.product} subtitle={item.date} />
              <Card.Content>
                <Chip>{item.status}</Chip>
              </Card.Content>
            </Card>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    opacity: 0.6,
  },
  card: {
    marginBottom: 12,
  },
});

export default OrdersScreen;
