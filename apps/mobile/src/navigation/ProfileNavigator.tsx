import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileStackParamList } from '../types/navigation';
import { ProfileScreen } from '../screens/profile';
import { PaymentMethodsScreen } from '../screens/profile/PaymentMethodsScreen';
import { MandateManagementScreen } from '../screens/mandate/MandateManagementScreen';

const Stack = createStackNavigator<ProfileStackParamList>();

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
        name="MandateManagement"
        component={MandateManagementScreen}
        options={{ title: 'Agent Mandates' }}
      />
    </Stack.Navigator>
  );
};
