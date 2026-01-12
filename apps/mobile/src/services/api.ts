import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '@agentic-commerce/shared-types';
import { storageService } from './storage.service';

// API Configuration
// For production: Update PRODUCTION_URL with your Railway domain
// For development: Use 10.0.2.2 for Android emulator (maps to host machine's localhost)
const PRODUCTION_URL = 'https://agenticcommerce-production.up.railway.app/api';
const DEVELOPMENT_URL = 'http://10.0.2.2:3000/api';

// Using Railway backend for all environments
const API_URL = PRODUCTION_URL;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await storageService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear storage
          await storageService.clearAll();
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url);
    return response.data.data as T;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  }
}

export const apiClient = new ApiClient();
