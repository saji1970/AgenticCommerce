import { LoginCredentials, RegisterData, AuthResponse } from '@agentic-commerce/shared-types';
import { apiClient } from './api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', credentials);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data);
  },
};
