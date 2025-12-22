import { apiService } from './api';
import * as SecureStore from 'expo-secure-store';

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
    await SecureStore.setItemAsync('authToken', response.token);
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    await SecureStore.setItemAsync('authToken', response.token);
    return response;
  }

  async logout(): Promise<void> {
    await apiService.post('/auth/logout');
    await SecureStore.deleteItemAsync('authToken');
  }

  async refreshToken(): Promise<string> {
    const response = await apiService.post<{ token: string }>('/auth/refresh');
    await SecureStore.setItemAsync('authToken', response.token);
    return response.token;
  }
}

export const authService = new AuthService();
