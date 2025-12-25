import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const orders: any[] = [];

  const handleLogin = () => {
    navigation.navigate('Login' as never);
  };

  const handleRegister = () => {
    navigation.navigate('Register' as never);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authPrompt}>
        <Text variant="headlineMedium" style={styles.authTitle}>
          Sign In to View Orders
        </Text>
        <Text variant="bodyLarge" style={styles.authSubtitle}>
          Create an account or sign in to track your purchases and view order history.
        </Text>
        <Button mode="contained" onPress={handleLogin} style={styles.authButton}>
          Sign In
        </Button>
        <Button mode="outlined" onPress={handleRegister} style={styles.authButton}>
          Create Account
        </Button>
      </View>
    );
  }

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
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  authSubtitle: {
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.7,
  },
  authButton: {
    width: '100%',
    marginVertical: 8,
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
