import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { AppMandateSetupScreen } from '../screens/mandate/AppMandateSetupScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleMandateCallback } from '../utils/mandateCheck';
import { getPendingIntentData, clearPendingIntentData } from '../utils/deepLink';
import { AppConfig } from '../config/app.config';

const PENDING_CART_ITEM_KEY = 'pending_demo_cart_item';
const LOCAL_INTENTS_KEY = 'demo_intents';
const MANDATE_TOKEN_KEY = 'mandate_token';

const Stack = createStackNavigator();

/**
 * Parse query params from deep link URL (works with custom schemes like agenticcommerce://)
 */
function parseDeepLinkParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const queryStart = url.indexOf('?');
    if (queryStart >= 0) {
      const query = url.substring(queryStart + 1);
      query.split('&').forEach((pair) => {
        const eq = pair.indexOf('=');
        if (eq >= 0) {
          const key = decodeURIComponent(pair.substring(0, eq).trim());
          const value = decodeURIComponent(pair.substring(eq + 1).trim());
          if (key) params[key] = value;
        }
      });
    }
  } catch (e) {
    console.warn('[RootNavigator] Failed to parse URL params:', e);
  }
  return params;
}

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { addToCart, refreshCart } = useCart();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Handle deep linking from Mandate app (payment completion callback)
    const handleDeepLink = async (url: string) => {
      console.log('[RootNavigator] Deep link received:', url);

      // Parse URL: agenticcommerce://payment-callback?mandateId=xxx&status=approved&paymentId=yyy
      // or: agenticcommerce://cart-callback?mandateId=xxx&status=approved (cart mandate approved)
      // or: agenticcommerce://intent-callback?mandateId=xxx&status=approved&intentId=yyy
      const isPaymentCallback = url.startsWith('agenticcommerce://payment-callback');
      const isCartCallback = url.startsWith('agenticcommerce://cart-callback');
      const isIntentCallback = url.startsWith('agenticcommerce://intent-callback');
      const isAppCallback = url.startsWith('agenticcommerce://app-callback');

      if (isPaymentCallback || isCartCallback || isIntentCallback || isAppCallback) {
        try {
          // Use manual parsing - new URL() can fail with custom schemes on React Native
          const params = parseDeepLinkParams(url);
          const mandateId = params.mandateId;
          const status = params.status;
          const mandateToken = params.mandateToken;

          if (mandateId && status) {
            // Update local mandate status
            await handleMandateCallback(mandateId, status);

            // Store mandate token if present (per-mandate + global)
            if (mandateToken) {
              console.log('[RootNavigator] Storing mandate token for mandateId:', mandateId);
              await AsyncStorage.setItem(MANDATE_TOKEN_KEY, mandateToken);
              await AsyncStorage.setItem(`mandate_token_${mandateId}`, mandateToken);
            }

            if (status === 'approved') {
              // App mandate callback: agent registered successfully
              if (isAppCallback) {
                Alert.alert(
                  'AI Agent Registered!',
                  'Your AI shopping agent is now active with your purchase limits.',
                  [{ text: 'OK' }]
                );
                return;
              }

              // Cart callback: add product to cart (use cartData from URL as fallback if pending item not in storage)
              if (isCartCallback) {
                let pendingItem: { productId: string; productName: string; productImage?: string; quantity: number; price: number } | null = null;

                // First try AsyncStorage (set when user tapped Buy Now)
                const pendingItemStr = await AsyncStorage.getItem(PENDING_CART_ITEM_KEY);
                if (pendingItemStr) {
                  try {
                    const parsed = JSON.parse(pendingItemStr);
                    pendingItem = {
                      productId: parsed.productId,
                      productName: parsed.productName,
                      productImage: parsed.productImage || '',
                      quantity: parsed.quantity || 1,
                      price: parsed.price ?? 0,
                    };
                  } catch {
                    /* ignore parse error */
                  }
                }

                // Fallback: cartData from callback URL (Mandate app passes product when approving)
                if (!pendingItem && params.cartData) {
                  try {
                    const cartData = typeof params.cartData === 'string'
                      ? JSON.parse(decodeURIComponent(params.cartData))
                      : params.cartData;
                    if (cartData.productId || cartData.id) {
                      pendingItem = {
                        productId: cartData.productId || cartData.id,
                        productName: cartData.productName || cartData.name || 'Product',
                        productImage: cartData.productImage || '',
                        quantity: cartData.quantity || 1,
                        price: cartData.price ?? 0,
                      };
                    }
                  } catch (e) {
                    console.warn('[RootNavigator] Failed to parse cartData from URL:', e);
                  }
                }

                if (pendingItem) {
                  try {
                    console.log('[RootNavigator] Adding to cart from callback:', pendingItem.productName);
                    await addToCart({
                      productId: pendingItem.productId,
                      productName: pendingItem.productName,
                      productImage: pendingItem.productImage || '',
                      quantity: pendingItem.quantity || 1,
                      price: pendingItem.price,
                    });
                    await AsyncStorage.removeItem(PENDING_CART_ITEM_KEY);
                    await refreshCart();

                    Alert.alert(
                      'Purchase Approved!',
                      `${pendingItem.productName} has been added to your cart.`,
                      [
                        {
                          text: 'View Cart',
                          onPress: () => {
                            if (navigationRef.current && isAuthenticated) {
                              navigationRef.current.navigate('App', { screen: 'Cart' });
                            }
                          },
                        },
                        { text: 'OK' },
                      ]
                    );
                  } catch (cartError: any) {
                    console.error('[RootNavigator] Failed to add to cart:', cartError);
                    Alert.alert(
                      'Mandate Approved',
                      'Authorization was approved but there was an issue adding the item to your cart. Please try again.',
                      [{ text: 'OK' }]
                    );
                  }
                } else {
                  Alert.alert(
                    'Mandate Approved',
                    'Authorization successful. You can now add items to your cart.',
                    [{ text: 'OK' }]
                  );
                }
                return; // Handled cart callback
              }

              if (isIntentCallback) {
                // Intent approved - update intent status in local storage
                const intentId = params.intentId;
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
                // Payment/cart mandate approved - add pending item to cart and refresh
                try {
                  const pendingItemStr = await AsyncStorage.getItem(PENDING_CART_ITEM_KEY);
                  console.log('[RootNavigator] Pending cart item from storage:', pendingItemStr ? 'found' : 'NOT FOUND');

                  if (pendingItemStr) {
                    const pendingItem = JSON.parse(pendingItemStr);
                    console.log('[RootNavigator] Adding to cart:', pendingItem.productName, pendingItem.productId);

                    // Use CartContext addToCart - it adds and refreshes cart state
                    await addToCart({
                      productId: pendingItem.productId,
                      productName: pendingItem.productName,
                      productImage: pendingItem.productImage || '',
                      quantity: pendingItem.quantity || 1,
                      price: pendingItem.price,
                    });

                    // Clear pending item
                    await AsyncStorage.removeItem(PENDING_CART_ITEM_KEY);
                    console.log('[RootNavigator] Cart updated, pending item cleared');

                    // Ensure cart UI is refreshed (addToCart already does this, but belt-and-suspenders)
                    await refreshCart();

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

    // Get initial URL if app was opened via deep link (e.g. cold start from "Return to Shopping")
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[RootNavigator] Initial URL (cold start):', url);
        handleDeepLink(url);
      }
    }).catch((err) => console.error('[RootNavigator] getInitialURL failed:', err));

    // Listen for deep links while app is running (e.g. app in background, user taps "Return to Shopping")
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[RootNavigator] URL event (app in foreground):', url);
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, addToCart, refreshCart]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => console.log('[RootNavigator] Navigation ready')}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={AppNavigator} />
            <Stack.Screen
              name="AppMandateSetup"
              component={AppMandateSetupScreen}
              options={{ headerShown: true, title: 'Register AI Agent' }}
            />
          </>
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
