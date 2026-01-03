import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Chip, Button, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { setIntentMandates, setCartMandates, setPaymentMandates } from '../store/slices/mandateSlice';

export const MandatesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { intentMandates, cartMandates, paymentMandates } = useSelector(
    (state: RootState) => state.mandates
  );

  useEffect(() => {
    loadMandates();
  }, []);

  const loadMandates = async () => {
    try {
      const [intents, carts, payments] = await Promise.all([
        api.getIntentMandates(),
        api.getCartMandates(),
        api.getPaymentMandates(),
      ]);
      dispatch(setIntentMandates(intents));
      dispatch(setCartMandates(carts));
      dispatch(setPaymentMandates(payments));
    } catch (error) {
      console.error('Error loading mandates:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Intent Mandates</Title>
          {intentMandates.length === 0 ? (
            <Paragraph style={styles.emptyText}>No intent mandates yet</Paragraph>
          ) : (
            intentMandates.map((mandate) => (
              <Card key={mandate.id} style={styles.card}>
                <Card.Content>
                  <Title>{mandate.intent}</Title>
                  <Chip
                    icon="lightbulb"
                    style={[
                      styles.statusChip,
                      mandate.status === 'active' && styles.activeChip,
                    ]}
                  >
                    {mandate.status}
                  </Chip>
                  <Paragraph style={styles.dateText}>
                    Created: {new Date(mandate.createdAt).toLocaleDateString()}
                  </Paragraph>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Cart Mandates</Title>
          {cartMandates.length === 0 ? (
            <Paragraph style={styles.emptyText}>No cart mandates yet</Paragraph>
          ) : (
            cartMandates.map((mandate) => (
              <Card key={mandate.id} style={styles.card}>
                <Card.Content>
                  <Title>{mandate.items.length} items</Title>
                  <Paragraph>Total: ${mandate.totalAmount.toFixed(2)}</Paragraph>
                  <Chip
                    icon="cart"
                    style={[
                      styles.statusChip,
                      mandate.status === 'approved' && styles.approvedChip,
                    ]}
                  >
                    {mandate.status}
                  </Chip>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Payment Mandates</Title>
          {paymentMandates.length === 0 ? (
            <Paragraph style={styles.emptyText}>No payment mandates yet</Paragraph>
          ) : (
            paymentMandates.map((mandate) => (
              <Card key={mandate.id} style={styles.card}>
                <Card.Content>
                  <Title>${mandate.amount.toFixed(2)} {mandate.currency}</Title>
                  <Paragraph>Method: {mandate.paymentMethod}</Paragraph>
                  <Chip
                    icon="credit-card"
                    style={[
                      styles.statusChip,
                      mandate.status === 'completed' && styles.completedChip,
                    ]}
                  >
                    {mandate.status}
                  </Chip>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  statusChip: {
    marginTop: 8,
  },
  activeChip: {
    backgroundColor: '#4CAF50',
  },
  approvedChip: {
    backgroundColor: '#2196F3',
  },
  completedChip: {
    backgroundColor: '#4CAF50',
  },
  dateText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
  },
  divider: {
    marginVertical: 8,
  },
});

