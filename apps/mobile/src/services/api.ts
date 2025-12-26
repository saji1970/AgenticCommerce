import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { API_URL } from '../config/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const credentials = await Keychain.getGenericPassword();
          if (credentials && credentials.password) {
            config.headers.Authorization = `Bearer ${credentials.password}`;
          }
        } catch (error) {
          // Silently fail if Keychain is unavailable
          console.warn('Failed to get auth token from Keychain:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            // Token expired, logout user
            await Keychain.resetGenericPassword();
            // Dispatch logout action or navigate to login
          } catch (storeError) {
            // Silently fail if Keychain is unavailable
            console.warn('Failed to delete auth token from Keychain:', storeError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
