import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/home';
import { ProfileScreen } from '../screens/profile';
import { ProductsNavigator } from './ProductsNavigator';
import { CartNavigator } from './CartNavigator';

const Tab = createBottomTabNavigator<AppStackParamList>();

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: true }} />
      <Tab.Screen
        name="Products"
        component={ProductsNavigator}
        options={{ title: 'Products' }}
      />
      <Tab.Screen
        name="Cart"
        component={CartNavigator}
        options={{ title: 'Cart' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true }} />
    </Tab.Navigator>
  );
};
