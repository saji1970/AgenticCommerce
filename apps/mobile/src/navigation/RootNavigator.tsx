import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paymentService } from '../services/payment.service';
import { AppConfig } from '../config/app.config';
import { handleMandateCallback } from '../utils/mandateCheck';

const PENDING_PAYMENT_KEY = 'pending_payment_request';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Handle deep linking from Mandate app (payment completion callback)
    const handleDeepLink = async (url: string) => {
      console.log('Deep link received:', url);

      // Parse URL: agenticcommerce://payment-callback?mandateId=xxx&status=approved&paymentId=yyy
      // or: agenticcommerce://intent-callback?mandateId=xxx&status=approved&intentId=yyy
      const isPaymentCallback = url.startsWith('agenticcommerce://payment-callback');
      const isIntentCallback = url.startsWith('agenticcommerce://intent-callback');

      if (isPaymentCallback || isIntentCallback) {
        try {
          const urlObj = new URL(url);
          const mandateId = urlObj.searchParams.get('mandateId');
          const status = urlObj.searchParams.get('status');

          if (mandateId && status) {
            // Update local mandate status
            await handleMandateCallback(mandateId, status);

            if (status === 'approved') {
              if (isIntentCallback) {
                // Intent approved
                Alert.alert(
                  'Intent Approved!',
                  'The AI Agent is now authorized to purchase this item for you when conditions are met.',
                  [
                    {
                      text: 'View Intents',
                      onPress: () => {
                        if (navigationRef.current && isAuthenticated) {
                          navigationRef.current.navigate('App', {
                            screen: 'Products',
                            params: { screen: 'Intents' },
                          });
                        }
                      },
                    },
                    { text: 'OK' },
                  ]
                );
              } else {
                // Payment mandate approved
                Alert.alert(
                  'Mandate Approved!',
                  'AI Agent is now authorized. Processing your payment...',
                  [{ text: 'OK' }]
                );

                // Auto-trigger payment with stored cart info
                try {
                  const pendingPaymentStr = await AsyncStorage.getItem(PENDING_PAYMENT_KEY);
                  if (pendingPaymentStr) {
                    const pendingPayment = JSON.parse(pendingPaymentStr);
                    const defaultAgent = AppConfig.getDefaultAgent();

                    // Process payment automatically (AI Agent triggered)
                    const result = await paymentService.processPayment(
                      pendingPayment.request,
                      defaultAgent.id,
                      true, // Skip mandate check since we just approved
                      pendingPayment.amount
                    );

                    // Clear pending payment
                    await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);

                    // Show success
                    Alert.alert(
                      'Payment Successful!',
                      `AI Agent has completed your purchase.\n\nTransaction ID: ${result.payment?.transactionId || 'N/A'}`,
                      [
                        {
                          text: 'View Order',
                          onPress: () => {
                            if (navigationRef.current && isAuthenticated) {
                              navigationRef.current.navigate('App', {
                                screen: 'Cart',
                                params: { screen: 'OrderHistory' },
                              });
                            }
                          },
                        },
                      ]
                    );
                  } else {
                    // No pending payment - just navigate to checkout
                    Alert.alert(
                      'Mandate Approved',
                      'You can now complete your purchase.',
                      [
                        {
                          text: 'Continue to Checkout',
                          onPress: () => {
                            if (navigationRef.current && isAuthenticated) {
                              navigationRef.current.navigate('App', {
                                screen: 'Cart',
                                params: { screen: 'Checkout' },
                              });
                            }
                          },
                        },
                      ]
                    );
                  }
                } catch (paymentError: any) {
                  console.error('Auto-payment failed:', paymentError);
                  Alert.alert(
                    'Payment Processing',
                    'Mandate approved but payment needs manual completion. Please return to checkout.',
                    [
                      {
                        text: 'Go to Checkout',
                        onPress: () => {
                          if (navigationRef.current && isAuthenticated) {
                            navigationRef.current.navigate('App', {
                              screen: 'Cart',
                              params: { screen: 'Checkout' },
                            });
                          }
                        },
                      },
                    ]
                  );
                }
              }
            } else if (status === 'rejected') {
              Alert.alert(
                isIntentCallback ? 'Intent Rejected' : 'Mandate Rejected',
                isIntentCallback
                  ? 'The intent authorization was rejected.'
                  : 'The authorization was rejected. No payment will be processed.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('Error parsing deep link:', error);
        }
      }
    };

    // Get initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
