import React, { useEffect, useRef, useState } from 'react';
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
import { VrpConsentScreen } from '../screens/VrpConsentScreen';

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
    <Stack.Screen
      name="VrpConsent"
      component={VrpConsentScreen}
      options={{ title: 'Recurring Payment Consent' }}
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
      listeners={({ navigation }) => ({
        tabPress: () => {
          // Always show mandates list when tab is pressed (not last mandate detail)
          navigation.navigate('Mandates', { screen: 'MandatesList' });
        },
      })}
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

interface PendingDeepLink {
  mandateId: string;
  cartData: any;
  intentData: any;
}

export const RootNavigator: React.FC = () => {
  const { user, loading, login } = useAuth();
  const navigationRef = useRef<any>(null);
  const [pendingDeepLink, setPendingDeepLink] = useState<PendingDeepLink | null>(null);

  const parseAndHandleDeepLink = async (url: string) => {
    console.log('Deep link received:', url);
    const match = url.match(/mandate:\/\/mandate\/([^/?]+)/);
    if (!match) return;

    const mandateId = match[1].split('?')[0];
    let cartData = null;
    let intentData = null;
    let userIdFromUrl: string | null = null;
    let userNameFromUrl: string | null = null;

    try {
      const urlObj = new URL(url.replace('mandate://', 'https://'));
      const cartDataParam = urlObj.searchParams.get('cartData');
      const intentDataParam = urlObj.searchParams.get('intentData');
      userIdFromUrl = urlObj.searchParams.get('userId');
      const userNameParam = urlObj.searchParams.get('userName');
      if (userNameParam) userNameFromUrl = decodeURIComponent(userNameParam);

      if (cartDataParam) {
        try {
          cartData = JSON.parse(decodeURIComponent(cartDataParam));
        } catch {
          cartData = JSON.parse(cartDataParam);
        }
        console.log('Cart data from deep link:', cartData);
      }
      if (intentDataParam) {
        try {
          intentData = JSON.parse(decodeURIComponent(intentDataParam));
        } catch {
          intentData = JSON.parse(intentDataParam);
        }
        console.log('Intent data from deep link:', intentData);
      }
    } catch (e) {
      console.error('Error parsing data from URL:', e);
    }

    const navParams = { mandateId, cartData, intentData };

    // Auto-login with userId from URL when coming from shopping app (ensures mandate app shows same user's mandates)
    if (userIdFromUrl) {
      console.log('[RootNavigator] Auto-login with userId from deep link:', userIdFromUrl, 'name:', userNameFromUrl);
      await login(userIdFromUrl, undefined, userNameFromUrl || undefined);
      setPendingDeepLink(navParams);
      return;
    }

    // Navigate immediately if user is logged in
    if (navigationRef.current) {
      navigationRef.current.navigate('Mandates', {
        screen: 'MandateDetail',
        params: navParams,
      });
    }
  };

  // Navigate when user becomes available and we have a pending deep link
  useEffect(() => {
    if (user && pendingDeepLink && navigationRef.current) {
      navigationRef.current.navigate('Mandates', {
        screen: 'MandateDetail',
        params: pendingDeepLink,
      });
      setPendingDeepLink(null);
    }
  }, [user, pendingDeepLink]);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) parseAndHandleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      parseAndHandleDeepLink(event.url);
    });

    return () => subscription.remove();
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
