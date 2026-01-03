import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  TextInput,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { setPriceRules, addPriceRule, removePriceRule } from '../store/slices/mandateSlice';

export const PriceRulesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { priceRules } = useSelector((state: RootState) => state.mandates);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [productName, setProductName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    loadPriceRules();
  }, []);

  const loadPriceRules = async () => {
    try {
      const rules = await api.getPriceRules();
      dispatch(setPriceRules(rules));
    } catch (error) {
      console.error('Error loading price rules:', error);
    }
  };

  const handleCreateRule = async () => {
    if (!productName.trim() || !targetPrice.trim()) {
      return;
    }

    try {
      const price = parseFloat(targetPrice);
      if (isNaN(price) || price <= 0) {
        return;
      }

      // In a real app, you'd search for the product first
      const rule = await api.createPriceRule('product-id', productName, price);
      dispatch(addPriceRule(rule));
      setDialogVisible(false);
      setProductName('');
      setTargetPrice('');
    } catch (error) {
      console.error('Error creating price rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await api.deletePriceRule(ruleId);
      dispatch(removePriceRule(ruleId));
    } catch (error) {
      console.error('Error deleting price rule:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setDialogVisible(true)}
            style={styles.addButton}
          >
            Create Price Alert
          </Button>
        </View>

        {priceRules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Paragraph style={styles.emptyText}>
              No price alerts yet. Create one to get notified when prices drop!
            </Paragraph>
          </View>
        ) : (
          priceRules.map((rule) => (
            <Card key={rule.id} style={styles.card}>
              <Card.Content>
                <Title>{rule.productName}</Title>
                <View style={styles.priceInfo}>
                  <Paragraph style={styles.currentPrice}>
                    Current: ${rule.currentPrice.toFixed(2)}
                  </Paragraph>
                  <Paragraph style={styles.targetPrice}>
                    Target: ${rule.targetPrice.toFixed(2)}
                  </Paragraph>
                </View>
                <View style={styles.actions}>
                  <Chip
                    icon={rule.status === 'active' ? 'bell' : 'bell-off'}
                    style={[
                      styles.statusChip,
                      rule.status === 'active' && styles.activeChip,
                    ]}
                  >
                    {rule.status}
                  </Chip>
                  <Button
                    mode="text"
                    onPress={() => handleDeleteRule(rule.id)}
                    textColor="#F44336"
                  >
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create Price Alert</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Product Name"
              value={productName}
              onChangeText={setProductName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Target Price ($)"
              value={targetPrice}
              onChangeText={setTargetPrice}
              mode="outlined"
              keyboardType="numeric"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateRule}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#6200EE',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    elevation: 2,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    color: '#666',
  },
  targetPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusChip: {
    backgroundColor: '#E0E0E0',
  },
  activeChip: {
    backgroundColor: '#4CAF50',
  },
  dialogInput: {
    marginBottom: 12,
  },
});

