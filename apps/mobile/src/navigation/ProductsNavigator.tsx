import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProductsStackParamList } from '../types/navigation';
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
        name="ProductList"
        component={ProductListScreen}
        options={{ title: 'Products' }}
      />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
        options={{ title: 'Product Details' }}
      />
    </Stack.Navigator>
  );
};
