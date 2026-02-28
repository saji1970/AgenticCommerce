import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileStackParamList } from '../types/navigation';
import { ProfileScreen } from '../screens/profile';
import { PaymentMethodsScreen } from '../screens/profile/PaymentMethodsScreen';
import { PaymentMandatesScreen } from '../screens/profile/PaymentMandatesScreen';
import { MandateManagementScreen } from '../screens/mandate/MandateManagementScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Stack = createStackNavigator<ProfileStackParamList>();

const PaymentMandatesWithBoundary = () => (
  <ErrorBoundary>
    <PaymentMandatesScreen />
  </ErrorBoundary>
);

export const ProfileNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: 'Payment Methods' }}
      />
      <Stack.Screen
        name="PaymentMandates"
        component={PaymentMandatesWithBoundary}
        options={{ title: 'Checkout Payment Mandate' }}
      />
      <Stack.Screen
        name="MandateManagement"
        component={MandateManagementScreen}
        options={{ title: 'Agent Mandates' }}
      />
    </Stack.Navigator>
  );
};
