import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AppStackParamList } from '../types/navigation';
import { AIChatScreen } from '../screens/chat';
import { ProductsNavigator } from './ProductsNavigator';
import { CartNavigator } from './CartNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { IntentsScreen } from '../screens/intents';

const Tab = createBottomTabNavigator<AppStackParamList>();

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tab.Screen
        name="Home"
        component={AIChatScreen}
        options={{
          headerShown: true,
          title: 'AI Assistant',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsNavigator}
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛍️</Text>,
        }}
      />
      <Tab.Screen
        name="Intents"
        component={IntentsScreen}
        options={{
          headerShown: true,
          title: 'My Intents',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⭐</Text>,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartNavigator}
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
