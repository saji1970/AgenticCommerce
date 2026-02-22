import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useIntent } from '../../contexts/IntentContext';
import { useCart } from '../../contexts/CartContext';
import { PurchaseIntent } from '@agentic-commerce/shared-types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const IntentsScreen: React.FC = () => {
  const { intents, loading, loadIntents, removeIntent, fulfillIntent } = useIntent();
  const { addToCart, refreshCart } = useCart();
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadIntents();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadIntents();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#10B981';
      case 'fulfilled':
        return '#3B82F6';
      case 'rejected':
        return '#EF4444';
      case 'expired':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
        return 'Active - Monitoring';
      case 'fulfilled':
        return 'Purchased';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const checkIntentConditions = (intent: PurchaseIntent): { met: boolean; reason: string } => {
    // Check if price condition is met (simulated - in real app would check current price)
    const currentPrice = (intent as any).currentPrice || intent.maxPrice;
    const maxPrice = intent.maxPrice || 0;

    if (currentPrice <= maxPrice) {
      return { met: true, reason: `Price $${currentPrice} is at or below max $${maxPrice}` };
    }

    return { met: false, reason: `Current price $${currentPrice} above max $${maxPrice}` };
  };

  /**
   * Handle adding intent item to cart with its mandate token, then mark as fulfilled
   */
  const handleAddToCart = async (intent: PurchaseIntent) => {
    try {
      setAddingToCart(true);

      // Retrieve the intent's mandate token for audit trail at checkout
      let mandateId = (intent as any).mandateId;
      let mandateToken: string | null = null;
      if (mandateId) {
        mandateToken = await AsyncStorage.getItem(`mandate_token_${mandateId}`);
        if (!mandateToken) {
          // Fallback to global token
          mandateToken = await AsyncStorage.getItem('mandate_token');
        }
      }

      await addToCart({
        productId: intent.productId,
        productName: intent.productName || 'Unknown Product',
        quantity: intent.quantity || 1,
        price: intent.maxPrice || 0,
        mandateId: mandateId || undefined,
        mandateToken: mandateToken || undefined,
      });
      await refreshCart();

      // Mark intent as fulfilled so it disappears from the intents page
      try {
        await fulfillIntent(intent.id);
      } catch (e) {
        console.warn('[IntentsScreen] Could not mark intent as fulfilled:', e);
      }

      Alert.alert(
        'Added to Cart',
        `${intent.productName} has been added to your cart.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add item to cart';
      Alert.alert('Error', errorMessage);
    } finally {
      setAddingToCart(false);
    }
  };

  /**
   * Handle removing an intent
   */
  const handleRemoveIntent = (intent: PurchaseIntent) => {
    Alert.alert(
      'Remove Intent',
      `Remove "${intent.productName}" from your intents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeIntent(intent.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove intent');
            }
          },
        },
      ]
    );
  };

  const handleTriggerPurchase = async (intent: PurchaseIntent) => {
    const conditions = checkIntentConditions(intent);

    if (conditions.met) {
      Alert.alert(
        'Conditions Met!',
        `${conditions.reason}\n\nWould you like to add this item to your cart for purchase?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Cart',
            onPress: () => handleAddToCart(intent),
          },
        ]
      );
    } else {
      Alert.alert(
        'Conditions Not Met',
        conditions.reason,
        [{ text: 'OK' }]
      );
    }
  };

  const renderIntent = ({ item }: { item: PurchaseIntent }) => {
    const conditions = checkIntentConditions(item);
    const isActive = item.status === 'approved';
    const createdDate = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={styles.intentCard}>
        <View style={styles.intentHeader}>
          <View style={styles.productInfo}>
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.productImageText}>
                {(item.productName || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.productName || 'Unknown Product'}
              </Text>
              <Text style={styles.productQuantity}>Qty: {item.quantity || 1}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.intentDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Max Price:</Text>
            <Text style={styles.detailValue}>${(item.maxPrice || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{createdDate}</Text>
          </View>
          {isActive && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Condition:</Text>
              <Text style={[styles.detailValue, { color: conditions.met ? '#10B981' : '#F59E0B' }]}>
                {conditions.met ? 'Met' : 'Waiting'}
              </Text>
            </View>
          )}
        </View>

        {isActive && conditions.met && (
          <View style={styles.conditionMetBanner}>
            <Text style={styles.conditionMetText}>
              Conditions met! Ready to purchase.
            </Text>
          </View>
        )}

        <View style={styles.intentActions}>
          {isActive && (
            <TouchableOpacity
              style={[styles.actionButton, conditions.met ? styles.actionButtonPrimary : styles.actionButtonSecondary]}
              onPress={() => handleTriggerPurchase(item)}
              disabled={addingToCart}
            >
              <Text style={conditions.met ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary}>
                {addingToCart ? 'Adding...' : conditions.met ? 'Add to Cart' : 'Check Conditions'}
              </Text>
            </TouchableOpacity>
          )}

          {item.status === 'fulfilled' && (
            <View style={styles.fulfilledBadge}>
              <Text style={styles.fulfilledText}>Purchase Complete</Text>
            </View>
          )}

          {item.status === 'pending' && (
            <Text style={styles.pendingText}>Waiting for approval in Mandate app</Text>
          )}

          {/* Remove Intent button - available for active and pending intents */}
          {(isActive || item.status === 'pending') && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveIntent(item)}
            >
              <Text style={styles.removeButtonText}>Remove Intent</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const activeIntents = intents.filter(i => i.status === 'approved');
  const pendingIntents = intents.filter(i => i.status === 'pending');
  const completedIntents = intents.filter(i => ['fulfilled', 'rejected', 'expired'].includes(i.status));

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeIntents.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingIntents.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedIntents.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {intents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Intents Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create purchase intents from product pages to let the AI agent monitor and buy items for you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={intents}
          keyExtractor={(item) => item.id}
          renderItem={renderIntent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            activeIntents.some(i => checkIntentConditions(i).met) ? (
              <View style={styles.alertBanner}>
                <Text style={styles.alertBannerText}>
                  Some intents have met their conditions and are ready for purchase!
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  intentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  intentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImageText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  intentDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  conditionMetBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  conditionMetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    textAlign: 'center',
  },
  intentActions: {
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#2563EB',
  },
  actionButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  fulfilledBadge: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fulfilledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  pendingText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  removeButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  alertBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    textAlign: 'center',
  },
});
