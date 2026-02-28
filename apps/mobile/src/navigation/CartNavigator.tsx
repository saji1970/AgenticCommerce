import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { CartStackParamList } from '../types/navigation';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { OrderHistoryScreen } from '../screens/cart/OrderHistoryScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Stack = createStackNavigator<CartStackParamList>();

const CheckoutWithErrorBoundary = (props: any) => (
  <ErrorBoundary>
    <CheckoutScreen {...props} />
  </ErrorBoundary>
);

export const CartNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Shopping Cart' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutWithErrorBoundary}
        options={{ title: 'Checkout' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'Order History' }}
      />
    </Stack.Navigator>
  );
};
