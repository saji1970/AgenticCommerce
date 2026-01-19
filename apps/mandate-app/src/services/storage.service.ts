import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email?: string;
  name?: string;
}

class StorageService {
  private readonly USER_KEY = 'mandate_user';
  private readonly USER_ID_KEY = 'mandate_user_id';

  async getUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(this.USER_KEY);
      if (!userJson) return null;
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(this.USER_ID_KEY, user.id);
    } catch (error) {
      console.error('Error setting user:', error);
      throw error;
    }
  }

  async getUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.USER_ID_KEY);
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_KEY);
      await AsyncStorage.removeItem(this.USER_ID_KEY);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  }
}

export const storageService = new StorageService();
export default storageService;
