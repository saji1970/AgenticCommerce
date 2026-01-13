import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { ProductsStackParamList } from '../../types/navigation';
import { useProduct } from '../../hooks/useProduct';
import { SearchBar } from '../../components/products/SearchBar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { SearchQuery } from '@agentic-commerce/shared-types';

type ProductSearchScreenNavigationProp = StackNavigationProp<
  ProductsStackParamList,
  'ProductSearch'
>;

export const ProductSearchScreen = () => {
  const navigation = useNavigation<ProductSearchScreenNavigationProp>();
  const {
    performAISearch,
    performNLPSearch,
    getSearchHistory,
    searchHistory,
    loading,
    error,
    clearError,
    clearProducts,
  } = useProduct();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      await getSearchHistory();
    } catch (err: any) {
      // Silently fail if user is not authenticated (401) or other errors
      // This is expected when the user hasn't logged in yet
      if (err.response?.status !== 401) {
        console.error('Failed to load search history:', err);
      }
    }
  };

  const handleSearch = async (query: string, createMandate: boolean = false) => {
    try {
      clearError();
      // Clear previous search results before starting new search
      clearProducts();

      // Use NLP search for natural language queries
      const result = await performNLPSearch(query, createMandate);
      const response = result.searchResponse;

      // Build detailed result message with better formatting
      let message = `Found ${response.products.length} product${response.products.length !== 1 ? 's' : ''}`;

      // Add parsed query info if available
      if (result.parsedQuery) {
        const { productType, maxPrice, minPrice, confidence, origin, destination, startDate, endDate, specifications } = result.parsedQuery;

        message += '\n\n━━━ Query Understanding ━━━';

        if (productType) {
          message += `\n📦 Product Type: ${productType}`;
        }

        // Price constraints
        if (maxPrice || minPrice) {
          message += '\n💰 Price Range:';
          if (minPrice && maxPrice) {
            message += ` $${minPrice} - $${maxPrice}`;
          } else if (maxPrice) {
            message += ` Up to $${maxPrice}`;
          } else if (minPrice) {
            message += ` From $${minPrice}`;
          }
        }

        // Travel info (for flights, hotels)
        if (origin || destination) {
          message += '\n✈️ Travel:';
          if (origin) message += ` From ${origin}`;
          if (destination) message += ` To ${destination}`;
        }

        if (startDate || endDate) {
          message += '\n📅 Dates:';
          if (startDate) {
            const formatted = new Date(startDate).toLocaleDateString();
            message += ` ${formatted}`;
          }
          if (endDate) {
            const formatted = new Date(endDate).toLocaleDateString();
            message += ` - ${formatted}`;
          }
        }

        // Specifications
        if (specifications && Object.keys(specifications).length > 0) {
          message += '\n🔍 Requirements:';
          Object.entries(specifications).forEach(([key, value]) => {
            message += `\n  • ${key}: ${value}`;
          });
        }

        // Confidence score
        if (confidence) {
          const emoji = confidence >= 90 ? '🟢' : confidence >= 70 ? '🟡' : '🔴';
          message += `\n\n${emoji} Confidence: ${confidence}%`;
        }
      }

      // Add intent info if created
      if (result.intentCreated) {
        message += '\n\n━━━ Smart Purchase Intent ━━━';
        message += `\n🎯 Type: ${result.intentCreated.type.replace('_', ' ').toUpperCase()}`;
        if (result.intentCreated.reasoning) {
          message += `\n💡 Why: ${result.intentCreated.reasoning}`;
        }

        // Show mandate info if created
        if (result.mandateCreated) {
          message += '\n\n━━━ Mandate Created ━━━';
          message += `\n🔐 Status: ${result.mandateCreated.status.toUpperCase()}`;
          message += `\n💰 Max Intent Value: $${result.mandateCreated.constraints.maxIntentValue || 'N/A'}`;
          message += `\n✅ Auto-approve under: $${result.mandateCreated.constraints.autoApproveUnder || 'N/A'}`;
          message += `\n📊 Max intents/day: ${result.mandateCreated.constraints.maxIntentsPerDay || 'N/A'}`;
          message += '\n\n✨ Autonomous purchases enabled!';
        } else {
          message += '\n\n✨ Ready to create mandate for auto-purchase!';
        }
      }

      const buttons = [];

      // If intent was detected and mandate wasn't created, offer to create it
      if (result.intentCreated && !result.mandateCreated && result.parsedQuery?.confidence >= 70) {
        buttons.push({
          text: '🔐 Create Mandate',
          onPress: async () => {
            try {
              // Re-run search with mandate creation
              await handleSearch(query, true);
            } catch (err) {
              Alert.alert('Error', 'Failed to create mandate');
            }
          },
        });
      }

      // If mandate was created, show option to view mandates
      if (result.mandateCreated) {
        buttons.push({
          text: 'View Mandates',
          onPress: () => {
            // TODO: Navigate to mandates screen
            Alert.alert('Coming Soon', 'Mandate management screen will be added');
          },
        });
      }

      buttons.push({
        text: 'View Products',
        onPress: () => navigation.navigate('ProductList', { searchQueryId: response.searchQueryId }),
      });

      Alert.alert(
        '🔍 Search Complete!',
        message,
        buttons
      );
    } catch (err: any) {
      Alert.alert('Search Failed', error || 'An error occurred during the search');
    }
  };

  const handleHistoryItemPress = (item: SearchQuery) => {
    if (item.id) {
      navigation.navigate('ProductList', { searchQueryId: item.id });
    }
  };

  const renderHistoryItem = ({ item }: { item: SearchQuery }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleHistoryItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.historyContent}>
        <Text style={styles.historyQuery} numberOfLines={2}>
          {item.queryText}
        </Text>
        <View style={styles.historyMeta}>
          <Text style={styles.historyStatus}>
            {item.status === 'completed' && `${item.resultsCount || 0} results`}
            {item.status === 'processing' && 'Processing...'}
            {item.status === 'failed' && 'Failed'}
          </Text>
          <Text style={styles.historyDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && searchHistory.length === 0) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <View style={styles.container}>
      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && (
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={() => clearError()} retryText="Dismiss" />
        </View>
      )}

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Searches</Text>
        {searchHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No search history yet</Text>
            <Text style={styles.emptySubtext}>
              Start by describing a product you want to buy
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyList}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    paddingHorizontal: 16,
  },
  historyContainer: {
    flex: 1,
    paddingTop: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyList: {
    paddingBottom: 16,
  },
  historyItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyQuery: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    lineHeight: 22,
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStatus: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
