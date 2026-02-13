import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleMandateCallback } from '../utils/mandateCheck';
import { cartService } from '../services/cart.service';
import { getPendingIntentData, clearPendingIntentData } from '../utils/deepLink';
import { AppConfig } from '../config/app.config';

const PENDING_CART_ITEM_KEY = 'pending_demo_cart_item';
const LOCAL_INTENTS_KEY = 'demo_intents';
const MANDATE_TOKEN_KEY = 'mandate_token';

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
          const mandateToken = urlObj.searchParams.get('mandateToken');

          if (mandateId && status) {
            // Update local mandate status
            await handleMandateCallback(mandateId, status);

            // Store mandate token if present
            if (mandateToken) {
              console.log('[RootNavigator] Storing mandate token for mandateId:', mandateId);
              await AsyncStorage.setItem(MANDATE_TOKEN_KEY, mandateToken);
            }

            if (status === 'approved') {
              if (isIntentCallback) {
                // Intent approved - update intent status in local storage
                const intentId = urlObj.searchParams.get('intentId');
                try {
                  const pendingIntent = await getPendingIntentData();
                  if (pendingIntent) {
                    const defaultAgent = AppConfig.getDefaultAgent();
                    const newIntent = {
                      id: intentId || `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      userId: 'demo-user',
                      productId: pendingIntent.productId,
                      productName: pendingIntent.productName,
                      quantity: pendingIntent.quantity,
                      maxPrice: pendingIntent.maxPrice || pendingIntent.price,
                      status: 'approved',
                      agentId: defaultAgent.id,
                      constraints: {},
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    };

                    // Save approved intent to local storage
                    const existingData = await AsyncStorage.getItem(LOCAL_INTENTS_KEY);
                    const localIntents = existingData ? JSON.parse(existingData) : [];
                    localIntents.push(newIntent);
                    await AsyncStorage.setItem(LOCAL_INTENTS_KEY, JSON.stringify(localIntents));

                    // Clear pending intent data
                    await clearPendingIntentData();
                    console.log('[RootNavigator] Intent approved and saved:', newIntent.id);
                  }
                } catch (intentError) {
                  console.error('Failed to save approved intent:', intentError);
                }

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
                // Payment mandate approved - add pending item to demo cart
                try {
                  const pendingItemStr = await AsyncStorage.getItem(PENDING_CART_ITEM_KEY);
                  if (pendingItemStr) {
                    const pendingItem = JSON.parse(pendingItemStr);

                    // Add item to local demo cart
                    await cartService.addToCart({
                      productId: pendingItem.productId,
                      productName: pendingItem.productName,
                      productImage: pendingItem.productImage,
                      quantity: pendingItem.quantity || 1,
                      price: pendingItem.price,
                    });

                    // Clear pending item
                    await AsyncStorage.removeItem(PENDING_CART_ITEM_KEY);

                    Alert.alert(
                      'Purchase Approved!',
                      `${pendingItem.productName} has been added to your cart.`,
                      [
                        {
                          text: 'View Cart',
                          onPress: () => {
                            if (navigationRef.current && isAuthenticated) {
                              navigationRef.current.navigate('App', {
                                screen: 'Cart',
                              });
                            }
                          },
                        },
                        { text: 'OK' },
                      ]
                    );
                  } else {
                    Alert.alert(
                      'Mandate Approved',
                      'Authorization successful. You can now add items to your cart.',
                      [{ text: 'OK' }]
                    );
                  }
                } catch (cartError: any) {
                  console.error('Failed to add item to cart after approval:', cartError);
                  Alert.alert(
                    'Mandate Approved',
                    'Authorization was approved but there was an issue adding the item to your cart. Please try again.',
                    [{ text: 'OK' }]
                  );
                }
              }
            } else if (status === 'rejected') {
              if (isIntentCallback) {
                // Clear pending intent data on rejection
                await clearPendingIntentData();
              }
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
