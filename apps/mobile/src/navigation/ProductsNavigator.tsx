import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProductsStackParamList } from '../types/navigation';
import { ProductSearchScreen } from '../screens/products/ProductSearchScreen';
import { ProductListScreen } from '../screens/products/ProductListScreen';
import { ProductDetailsScreen } from '../screens/products/ProductDetailsScreen';

const Stack = createStackNavigator<ProductsStackParamList>();

export const ProductsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="ProductSearch"
        component={ProductSearchScreen}
        options={{ title: 'AI Product Search' }}
      />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: 'Search Results' }}
      />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
        options={{ title: 'Product Details' }}
      />
    </Stack.Navigator>
  );
};
