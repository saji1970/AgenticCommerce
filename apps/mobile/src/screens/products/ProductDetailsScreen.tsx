import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ProductsStackParamList } from '../../types/navigation';
import { useProduct } from '../../hooks/useProduct';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Product } from '@agentic-commerce/shared-types';
import { productService } from '../../services/product.service';

type ProductDetailsScreenNavigationProp = StackNavigationProp<
  ProductsStackParamList,
  'ProductDetails'
>;

type ProductDetailsScreenRouteProp = RouteProp<ProductsStackParamList, 'ProductDetails'>;

export const ProductDetailsScreen = () => {
  const navigation = useNavigation<ProductDetailsScreenNavigationProp>();
  const route = useRoute<ProductDetailsScreenRouteProp>();
  const { productId } = route.params;

  const { deleteProduct: contextDeleteProduct } = useProduct();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getProductById(productId);
      setProduct(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load product';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewWebsite = async () => {
    if (!product?.productUrl) return;

    try {
      const supported = await Linking.canOpenURL(product.productUrl);
      if (supported) {
        await Linking.openURL(product.productUrl);
      } else {
        Alert.alert('Error', `Cannot open URL: ${product.productUrl}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open website');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!product) return;

    try {
      setDeleting(true);
      await contextDeleteProduct(product.id);
      Alert.alert('Success', 'Product deleted successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading product..." />;
  }

  if (error || !product) {
    return <ErrorMessage message={error || 'Product not found'} onRetry={loadProduct} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {product.imageUrl && (
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {product.currency} {product.price ? product.price.toFixed(2) : 'N/A'}
          </Text>
          {product.source && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>{product.source.split(':')[0]}</Text>
            </View>
          )}
        </View>

        {product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        )}

        {product.rawData?.specifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {Object.entries(product.rawData.specifications).map(([key, value]) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{key}:</Text>
                <Text style={styles.specValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {product.rawData?.rating !== undefined && (
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>
              ⭐ {product.rawData.rating.toFixed(1)}
            </Text>
            {product.rawData?.reviewCount && (
              <Text style={styles.reviewCount}>
                ({product.rawData.reviewCount} reviews)
              </Text>
            )}
          </View>
        )}

        {product.rawData?.availability && (
          <View style={styles.availabilityContainer}>
            <Text style={styles.availabilityLabel}>Availability:</Text>
            <Text style={styles.availabilityValue}>{product.rawData.availability}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Button
            title="View on Website"
            onPress={handleViewWebsite}
            variant="primary"
            style={styles.viewButton}
          />
          <Button
            title="Delete"
            onPress={handleDelete}
            variant="secondary"
            loading={deleting}
            style={styles.deleteButton}
          />
        </View>

        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Added: {new Date(product.createdAt).toLocaleDateString()}
          </Text>
          {product.aiExtracted && (
            <Text style={styles.aiLabel}>AI Extracted</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 24,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#fff',
  },
  infoContainer: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
  },
  sourceBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sourceText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  specKey: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    marginRight: 8,
  },
  specValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6c757d',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  availabilityLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 6,
  },
  availabilityValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  viewButton: {
    width: '100%',
  },
  deleteButton: {
    width: '100%',
    backgroundColor: '#dc3545',
  },
  metadata: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: '#6c757d',
  },
  aiLabel: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
