import { apiService } from './api';
import { getItem, setItem, removeItem } from '../utils/storage';

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
    if (response.token) {
      await setItem('authToken', response.token);
    }
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    if (response.token) {
      await setItem('authToken', response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    await removeItem('authToken');
  }

  async getStoredToken(): Promise<string | null> {
    return await getItem('authToken');
  }
}

export const authService = new AuthService();

