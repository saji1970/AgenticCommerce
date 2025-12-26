import { apiService } from './api';
import * as Keychain from 'react-native-keychain';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    try {
      await Keychain.setGenericPassword('authToken', response.token);
    } catch (error) {
      console.warn('Failed to store auth token:', error);
      // Continue even if storage fails
    }
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    try {
      await Keychain.setGenericPassword('authToken', response.token);
    } catch (error) {
      console.warn('Failed to store auth token:', error);
      // Continue even if storage fails
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    try {
      await Keychain.resetGenericPassword();
    } catch (error) {
      console.warn('Failed to delete auth token:', error);
    }
  }

  async refreshToken(): Promise<string> {
    const response = await apiService.post<{ token: string }>('/auth/refresh');
    try {
      await Keychain.setGenericPassword('authToken', response.token);
    } catch (error) {
      console.warn('Failed to store refreshed token:', error);
      // Continue even if storage fails
    }
    return response.token;
  }
}

export const authService = new AuthService();
