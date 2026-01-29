import { Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Deep Link Utility
 * Handles opening the Mandate app via deep links and receiving callbacks
 */

const MANDATE_APP_SCHEME = 'mandate://mandate';
const MANDATE_APP_PACKAGE = 'com.agentic.mandate';
const AGENTIC_COMMERCE_SCHEME = 'agenticcommerce://';
const PENDING_CART_DATA_KEY = 'pending_mandate_cart_data';

export interface CartItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartData {
  items: CartItemData[];
  total: number;
  agentName: string;
}

/**
 * Save cart data for mandate app to retrieve
 */
export async function saveCartDataForMandate(data: CartData): Promise<void> {
  await AsyncStorage.setItem(PENDING_CART_DATA_KEY, JSON.stringify(data));
}

/**
 * Get cart data saved for mandate
 */
export async function getCartDataForMandate(): Promise<CartData | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_CART_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Open Mandate app with a specific mandate ID and cart data
 */
export async function openMandateApp(mandateId: string, cartData?: CartData): Promise<boolean> {
  try {
    // Encode cart data in URL for mandate app to display
    let url = `${MANDATE_APP_SCHEME}/${mandateId}`;

    if (cartData) {
      // URL encode the cart data JSON
      const encodedCartData = encodeURIComponent(JSON.stringify(cartData));
      url = `${url}?cartData=${encodedCartData}`;
    }

    console.log('Opening Mandate app with URL:', url);
    
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      // Try to open Play Store if app not installed
      if (Platform.OS === 'android') {
        const playStoreUrl = `market://details?id=${MANDATE_APP_PACKAGE}`;
        const canOpenPlayStore = await Linking.canOpenURL(playStoreUrl);
        if (canOpenPlayStore) {
          await Linking.openURL(playStoreUrl);
          Alert.alert(
            'Mandate App Required',
            'Please install the Mandate Manager app to approve mandates.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Mandate App Required',
            'Please install the Mandate Manager app from the Play Store to approve mandates.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Mandate App Required',
          'Please install the Mandate Manager app to approve mandates.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Error opening Mandate app:', error);
    Alert.alert('Error', 'Failed to open Mandate app');
    return false;
  }
}

/**
 * Check if Mandate app is installed
 */
export async function isMandateAppInstalled(): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(MANDATE_APP_SCHEME);
    return canOpen;
  } catch (error) {
    return false;
  }
}

/**
 * Open AgenticCommerce app with payment completion callback
 * Used by Mandate app to return after payment approval
 */
export function openAgenticCommerceApp(params: {
  mandateId: string;
  status: 'approved' | 'rejected';
  paymentId?: string;
}): string {
  const { mandateId, status, paymentId } = params;
  const url = `${AGENTIC_COMMERCE_SCHEME}payment-callback?mandateId=${mandateId}&status=${status}${paymentId ? `&paymentId=${paymentId}` : ''}`;
  return url;
}

export interface IntentData {
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  maxPrice?: number;
  reasoning?: string;
  agentName: string;
}

const PENDING_INTENT_DATA_KEY = 'pending_intent_data';

/**
 * Save intent data for later use when returning from Mandate app
 */
export async function savePendingIntentData(data: IntentData): Promise<void> {
  await AsyncStorage.setItem(PENDING_INTENT_DATA_KEY, JSON.stringify(data));
}

/**
 * Get pending intent data saved before opening Mandate app
 */
export async function getPendingIntentData(): Promise<IntentData | null> {
  try {
    const data = await AsyncStorage.getItem(PENDING_INTENT_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Clear pending intent data after it's been processed
 */
export async function clearPendingIntentData(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INTENT_DATA_KEY);
}

/**
 * Open Mandate app for intent approval
 * Creates a pending mandate and opens the Mandate app for user to approve with biometric and sign
 */
export async function openMandateAppForIntent(intentData: IntentData, mandateId: string): Promise<boolean> {
  try {
    // Save intent data for when we return from Mandate app
    await savePendingIntentData(intentData);

    // Encode intent data in URL for mandate app to display
    const encodedIntentData = encodeURIComponent(JSON.stringify({
      type: 'intent',
      product: {
        id: intentData.productId,
        name: intentData.productName,
        image: intentData.productImage,
        price: intentData.price,
        quantity: intentData.quantity,
      },
      maxPrice: intentData.maxPrice || intentData.price,
      reasoning: intentData.reasoning,
      agentName: intentData.agentName,
    }));

    const url = `${MANDATE_APP_SCHEME}/${mandateId}?intentData=${encodedIntentData}`;
    console.log('Opening Mandate app for intent approval:', url);

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      if (Platform.OS === 'android') {
        Alert.alert(
          'Mandate App Required',
          'Please install the Mandate Manager app to approve intents.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Error opening Mandate app for intent:', error);
    Alert.alert('Error', 'Failed to open Mandate app');
    return false;
  }
}

/**
 * Build callback URL for intent approval
 * Used by Mandate app to return to AgenticCommerce after intent approval
 */
export function buildIntentCallbackUrl(params: {
  mandateId: string;
  intentId?: string;
  status: 'approved' | 'rejected';
}): string {
  const { mandateId, intentId, status } = params;
  return `${AGENTIC_COMMERCE_SCHEME}intent-callback?mandateId=${mandateId}&status=${status}${intentId ? `&intentId=${intentId}` : ''}`;
}
