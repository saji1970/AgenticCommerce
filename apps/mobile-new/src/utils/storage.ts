/**
 * Storage utility with fallback support
 * Uses SecureStore when available, falls back to AsyncStorage for Expo Go
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'agentic_commerce_';

// Dynamically import SecureStore to handle cases where it's not available
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (error) {
  // SecureStore not available (e.g., in Expo Go without plugin)
  console.log('SecureStore not available, using AsyncStorage fallback');
}

/**
 * Get item from storage (tries SecureStore first, falls back to AsyncStorage)
 */
export const getItem = async (key: string): Promise<string | null> => {
  // Try SecureStore first if available
  if (SecureStore) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) {
        return value;
      }
    } catch (error) {
      // SecureStore failed, fall back to AsyncStorage
      console.warn(`SecureStore.getItemAsync failed for ${key}, using AsyncStorage:`, error);
    }
  }

  // Fallback to AsyncStorage
  try {
    return await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Error getting item ${key} from AsyncStorage:`, error);
    return null;
  }
};

/**
 * Set item in storage (tries SecureStore first, falls back to AsyncStorage)
 */
export const setItem = async (key: string, value: string): Promise<void> => {
  // Try SecureStore first if available
  if (SecureStore) {
    try {
      await SecureStore.setItemAsync(key, value);
      return; // Success, exit early
    } catch (error) {
      // SecureStore failed, fall back to AsyncStorage
      console.warn(`SecureStore.setItemAsync failed for ${key}, using AsyncStorage:`, error);
    }
  }

  // Fallback to AsyncStorage
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch (error) {
    console.error(`Error setting item ${key} in AsyncStorage:`, error);
    throw error;
  }
};

/**
 * Remove item from storage (tries SecureStore first, falls back to AsyncStorage)
 */
export const removeItem = async (key: string): Promise<void> => {
  // Try SecureStore first if available
  if (SecureStore) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // SecureStore failed, fall back to AsyncStorage
      console.warn(`SecureStore.deleteItemAsync failed for ${key}, using AsyncStorage:`, error);
    }
  }

  // Also remove from AsyncStorage (in case it was stored there)
  try {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Error removing item ${key} from AsyncStorage:`, error);
  }
};

