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
    getSearchHistory,
    searchHistory,
    loading,
    error,
    clearError,
  } = useProduct();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      await getSearchHistory();
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      clearError();
      const response = await performAISearch({ query });

      Alert.alert(
        'Search Complete!',
        `Found ${response.products.length} products in ${(response.metadata.processingTimeMs / 1000).toFixed(1)}s`,
        [
          {
            text: 'View Results',
            onPress: () => navigation.navigate('ProductList', { searchQueryId: response.searchQueryId }),
          },
        ]
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
