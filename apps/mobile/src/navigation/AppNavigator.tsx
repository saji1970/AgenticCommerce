import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppStackParamList } from '../types/navigation';
import { AIChatScreen } from '../screens/chat';
import { ProductsNavigator } from './ProductsNavigator';
import { CartNavigator } from './CartNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { IntentsScreen } from '../screens/intents';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<AppStackParamList>();

const TabIcon = ({
  name,
  focused,
  outlineName,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  outlineName?: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.iconWrapper}>
    <Ionicons
      name={focused ? name : (outlineName || name)}
      size={22}
      color={focused ? colors.action : colors.textMuted}
    />
    {focused && <View style={styles.activeBar} />}
  </View>
);

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={AIChatScreen}
        options={{
          headerShown: true,
          title: 'AI Assistant',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="chatbubble" outlineName="chatbubble-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsNavigator}
        options={{
          title: 'Products',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bag" outlineName="bag-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Intents"
        component={IntentsScreen}
        options={{
          headerShown: true,
          title: 'My Intents',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart" outlineName="heart-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartNavigator}
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="cart" outlineName="cart-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" outlineName="person-outline" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBar: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.action,
  },
});
