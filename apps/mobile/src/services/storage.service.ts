import * as Keychain from 'react-native-keychain';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const storageService = {
  async saveToken(token: string): Promise<void> {
    await Keychain.setGenericPassword(TOKEN_KEY, token, {
      service: TOKEN_KEY,
    });
  },

  async getToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: TOKEN_KEY,
      });
      return credentials ? credentials.password : null;
    } catch (error) {
      return null;
    }
  },

  async removeToken(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: TOKEN_KEY,
    });
  },

  async saveUser(user: any): Promise<void> {
    await Keychain.setGenericPassword(USER_KEY, JSON.stringify(user), {
      service: USER_KEY,
    });
  },

  async getUser(): Promise<any | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: USER_KEY,
      });
      return credentials ? JSON.parse(credentials.password) : null;
    } catch (error) {
      return null;
    }
  },

  async removeUser(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: USER_KEY,
    });
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  },
};
