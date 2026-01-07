import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ProductsStackParamList } from '../../types/navigation';
import { useProduct } from '../../hooks/useProduct';
import { ProductCard } from '../../components/products/ProductCard';
import { FilterChips } from '../../components/products/FilterChips';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Product } from '@agentic-commerce/shared-types';

type ProductListScreenNavigationProp = StackNavigationProp<
  ProductsStackParamList,
  'ProductList'
>;

type ProductListScreenRouteProp = RouteProp<ProductsStackParamList, 'ProductList'>;

export const ProductListScreen = () => {
  const navigation = useNavigation<ProductListScreenNavigationProp>();
  const route = useRoute<ProductListScreenRouteProp>();
  const { searchQueryId } = route.params;

  const {
    products,
    filters,
    loading,
    error,
    fetchProducts,
    refreshProducts,
    clearError,
  } = useProduct();

  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [searchQueryId]);

  const loadProducts = async () => {
    try {
      await fetchProducts();
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProducts();
    } catch (err) {
      console.error('Failed to refresh products:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      }
      return [...prev, filterId];
    });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };

  const getFilteredProducts = () => {
    if (selectedFilters.length === 0) {
      return products;
    }

    return products.filter((product) => {
      const selectedFilterObjects = filters.filter((f) => selectedFilters.includes(f.id));

      return selectedFilterObjects.every((filter) => {
        if (filter.filterType === 'price_range' && filter.filterValue) {
          const value = typeof filter.filterValue === 'string' ? JSON.parse(filter.filterValue) : filter.filterValue;
          const productPrice = product.price || 0;

          if (value.min !== undefined && productPrice < value.min) return false;
          if (value.max !== undefined && productPrice > value.max) return false;
          return true;
        }

        if (filter.filterType === 'category' && filter.filterValue) {
          const categoryValue = typeof filter.filterValue === 'string' ? filter.filterValue.toLowerCase() : '';
          const productCategory = product.rawData?.category?.toLowerCase() || '';
          return productCategory.includes(categoryValue);
        }

        if (filter.filterType === 'brand' && filter.filterValue) {
          const brandValue = typeof filter.filterValue === 'string' ? filter.filterValue.toLowerCase() : '';
          const productBrand = product.rawData?.brand?.toLowerCase() || '';
          return productBrand.includes(brandValue);
        }

        return true;
      });
    });
  };

  const filteredProducts = getFilteredProducts();

  if (loading && products.length === 0) {
    return <LoadingSpinner message="Loading products..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadProducts} />;
  }

  if (!loading && products.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorMessage message="No products found" onRetry={loadProducts} retryText="Retry" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filters.length > 0 && (
        <FilterChips
          filters={filters}
          selectedFilters={selectedFilters}
          onFilterToggle={handleFilterToggle}
        />
      )}

      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => handleProductPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ErrorMessage
              message="No products match the selected filters"
              onRetry={() => setSelectedFilters([])}
              retryText="Clear Filters"
            />
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});
