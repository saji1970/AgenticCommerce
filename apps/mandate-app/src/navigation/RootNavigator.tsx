import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MandatesScreen } from '../screens/MandatesScreen';
import { MandateDetailScreen } from '../screens/MandateDetailScreen';
import { AIAppsScreen } from '../screens/AIAppsScreen';
import { DefaultLimitsScreen } from '../screens/DefaultLimitsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MandatesStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MandatesList"
      component={MandatesScreen}
      options={{ title: 'Mandates' }}
    />
    <Stack.Screen
      name="MandateDetail"
      component={MandateDetailScreen}
      options={{ title: 'Mandate Details' }}
    />
  </Stack.Navigator>
);

const AIAppsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AIAppsList"
      component={AIAppsScreen}
      options={{ title: 'AI Apps' }}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SettingsMain"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
    <Stack.Screen
      name="DefaultLimits"
      component={DefaultLimitsScreen}
      options={{ title: 'Default Limits' }}
    />
    <Stack.Screen
      name="PaymentMethods"
      component={PaymentMethodsScreen}
      options={{ title: 'Payment Methods' }}
    />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#2563EB',
      tabBarInactiveTintColor: '#6B7280',
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
      }}
    />
    <Tab.Screen
      name="AIApps"
      component={AIAppsStack}
      options={{
        tabBarLabel: 'AI Apps',
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤖</Text>,
      }}
    />
    <Tab.Screen
      name="Mandates"
      component={MandatesStack}
      options={{
        tabBarLabel: 'Mandates',
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsStack}
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
      }}
    />
  </Tab.Navigator>
);

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Handle deep linking
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      // Parse URL: mandate://mandate/{mandateId}?cartData={encodedData}&intentData={encodedData}
      const match = url.match(/mandate:\/\/mandate\/([^/?]+)/);
      if (match && navigationRef.current) {
        const mandateId = match[1].split('?')[0]; // Remove query string from mandateId

        // Extract cart data and intent data from query string
        let cartData = null;
        let intentData = null;
        try {
          const urlObj = new URL(url.replace('mandate://', 'https://'));
          const cartDataParam = urlObj.searchParams.get('cartData');
          const intentDataParam = urlObj.searchParams.get('intentData');

          if (cartDataParam) {
            cartData = JSON.parse(decodeURIComponent(cartDataParam));
            console.log('Cart data from deep link:', cartData);
          }

          if (intentDataParam) {
            intentData = JSON.parse(decodeURIComponent(intentDataParam));
            console.log('Intent data from deep link:', intentData);
          }
        } catch (e) {
          console.error('Error parsing data from URL:', e);
        }

        // Navigate to mandate detail with cart/intent data
        navigationRef.current.navigate('Mandates', {
          screen: 'MandateDetail',
          params: { mandateId, cartData, intentData },
        });
      }
    };

    // Get initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
};
