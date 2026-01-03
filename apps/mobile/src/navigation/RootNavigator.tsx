import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatScreen } from '../screens/ChatScreen';
import { MandatesScreen } from '../screens/MandatesScreen';
import { PriceRulesScreen } from '../screens/PriceRulesScreen';

export type RootStackParamList = {
  Chat: undefined;
  Mandates: undefined;
  PriceRules: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Chat"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200EE',
        },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Mandates"
        component={MandatesScreen}
        options={{
          title: 'My Mandates',
        }}
      />
      <Stack.Screen
        name="PriceRules"
        component={PriceRulesScreen}
        options={{
          title: 'Price Alerts',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

