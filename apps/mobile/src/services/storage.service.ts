import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const FALLBACK_PREFIX = 'storage_fallback_';

let useFallback = false;

async function secureGet(key: string): Promise<string | null> {
  if (useFallback) {
    return AsyncStorage.getItem(FALLBACK_PREFIX + key);
  }
  try {
    const value = await SecureStore.getItemAsync(key);
    return value;
  } catch (error) {
    console.warn('[Storage] SecureStore failed, falling back to AsyncStorage:', (error as Error)?.message);
    useFallback = true;
    return AsyncStorage.getItem(FALLBACK_PREFIX + key);
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (useFallback) {
    await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn('[Storage] SecureStore failed, falling back to AsyncStorage:', (error as Error)?.message);
    useFallback = true;
    await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  try {
    if (!useFallback) await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
  await AsyncStorage.removeItem(FALLBACK_PREFIX + key);
}

export const storageService = {
  async saveToken(token: string): Promise<void> {
    await secureSet(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    try {
      return await secureGet(TOKEN_KEY);
    } catch (error) {
      return null;
    }
  },

  async removeToken(): Promise<void> {
    await secureDelete(TOKEN_KEY);
  },

  async saveUser(user: any): Promise<void> {
    await secureSet(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    try {
      const userData = await secureGet(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  },

  async removeUser(): Promise<void> {
    await secureDelete(USER_KEY);
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  },
};
