import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

export interface PaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod?: string;
  cardDetails?: any;
  paypalDetails?: any;
  metadata?: any;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  processedAt?: string;
  gateway?: string;
  error?: string;
}

/**
 * Payment Gateway Service
 * Connects to the mock payment gateway service
 */
class PaymentGatewayService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.paymentGateway.url;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
  }

  /**
   * Process a payment through the gateway
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await this.client.post<PaymentResponse>(
        '/process',
        request
      );

      return response.data;
    } catch (error: any) {
      console.error('Payment gateway error:', error.message);
      
      // If it's a network error or timeout, return a failure
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: `Payment gateway unavailable: ${error.message}`,
        };
      }

      // If the gateway returned an error response
      if (error.response?.data) {
        return error.response.data;
      }

      throw error;
    }
  }

  /**
   * Check if payment gateway is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export const paymentGatewayService = new PaymentGatewayService();
export default paymentGatewayService;
