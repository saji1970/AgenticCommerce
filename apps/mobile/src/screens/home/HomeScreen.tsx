import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../hooks/useAuth';
import { Product } from '@agentic-commerce/shared-types';
import { productService } from '../../services/product.service';
import { ProductCard } from '../../components/products/ProductCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ProductsStackParamList } from '../../types/navigation';

type HomeScreenNavigationProp = StackNavigationProp<ProductsStackParamList, 'ProductList'>;

export const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [frequentlySearchedProducts, setFrequentlySearchedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFrequentlySearchedProducts();
  }, []);

  const loadFrequentlySearchedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const products = await productService.getFrequentlySearchedProducts(8);
      setFrequentlySearchedProducts(products);
    } catch (err: any) {
      // Silently fail if user is not authenticated (401) or other errors
      // This is expected when the user hasn't logged in yet
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error('Failed to load frequently searched products:', err);
        setError('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (product: Product) => {
    // Navigate directly to product details when product is clicked
    if (product.id) {
      navigation.navigate('ProductDetails', { productId: product.id });
    } else {
      Alert.alert('Error', 'Product information is incomplete');
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard product={item} onPress={() => handleProductPress(item)} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.firstName}!</Text>
        <Text style={styles.subtitle}>Your personalized shopping assistant</Text>
      </View>

      {loading && frequentlySearchedProducts.length === 0 ? (
        <LoadingSpinner message="Loading your favorite products..." />
      ) : frequentlySearchedProducts.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Searched Products</Text>
            <Text style={styles.sectionSubtitle}>
              Products you search for most often
            </Text>
          </View>
          <FlatList
            data={frequentlySearchedProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.productsList}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No search history yet</Text>
          <Text style={styles.emptySubtext}>
            Start searching for products to see your frequently searched items here
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadFrequentlySearchedProducts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  productsList: {
    paddingBottom: 8,
  },
  productCardWrapper: {
    marginBottom: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
