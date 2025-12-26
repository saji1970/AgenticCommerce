import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            {stripePublishableKey ? (
              <StripeProvider publishableKey={stripePublishableKey}>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </StripeProvider>
            ) : (
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            )}
          </PaperProvider>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
