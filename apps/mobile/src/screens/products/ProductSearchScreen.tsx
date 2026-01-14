import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { ProductsStackParamList } from '../../types/navigation';
import { useProduct } from '../../hooks/useProduct';
import { SearchBar } from '../../components/products/SearchBar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

type ProductSearchScreenNavigationProp = StackNavigationProp<
  ProductsStackParamList,
  'ProductSearch'
>;

export const ProductSearchScreen = () => {
  const navigation = useNavigation<ProductSearchScreenNavigationProp>();
  const {
    performNLPSearch,
    loading,
    error,
    clearError,
    clearProducts,
  } = useProduct();

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

  return (
    <View style={styles.container}>
      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && (
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={() => clearError()} retryText="Dismiss" />
        </View>
      )}
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
});
