import { Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from '../services/storage.service';

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

export type { OpenMandateAppOptions } from './mandateUrlBuilder';
export { buildMandateAppUrl } from './mandateUrlBuilder';
import type { OpenMandateAppOptions } from './mandateUrlBuilder';
import { buildMandateAppUrl } from './mandateUrlBuilder';

/**
 * Open Mandate app with a specific mandate ID, cart data, and userId for auto-login
 */
export async function openMandateApp(
  mandateId: string,
  options?: OpenMandateAppOptions | CartData
): Promise<boolean> {
  try {
    const url = buildMandateAppUrl(mandateId, options);
    console.log('[deepLink] Opening Mandate app with URL:', url);

    // On Android 11+, canOpenURL can return false for custom schemes even when app is installed
    // (package visibility). Try openURL first - it works if Mandate app is installed.
    try {
      await Linking.openURL(url);
      console.log('[deepLink] Linking.openURL succeeded - Mandate app opened');
      return true;
    } catch (openError: any) {
      console.warn('[deepLink] Linking.openURL failed:', openError?.message || openError);
      // Mandate app not installed or couldn't open - show install prompt
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(`market://details?id=${MANDATE_APP_PACKAGE}`);
          Alert.alert(
            'Mandate App Required',
            'Please install the Mandate Manager app to approve mandates.',
            [{ text: 'OK' }]
          );
        } catch {
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
  } catch (error) {
    console.error('[deepLink] Error opening Mandate app:', error);
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
  intentType?: string;
  targetPrice?: number;
  scheduledDate?: string;
  customReasoning?: string;
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
 * Uses same openMandateApp flow as cart - passes intentData, userId for consistency
 */
export async function openMandateAppForIntent(intentData: IntentData, mandateId: string): Promise<boolean> {
  try {
    // Save intent data for when we return from Mandate app
    await savePendingIntentData(intentData);

    // Use openMandateApp for consistency with cart flow (includes userId, etc.)
    const opts: OpenMandateAppOptions = {
      intentData: {
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
        intentType: intentData.intentType,
        targetPrice: intentData.targetPrice,
        scheduledDate: intentData.scheduledDate,
        customReasoning: intentData.customReasoning,
      },
    };
    const user = await storageService.getUser();
    if (user?.id) opts.userId = user.id;
    if (user?.name) opts.userName = user.name;
    return await openMandateApp(mandateId, opts);
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
