import axios from 'axios';
import { storageService } from './storage.service';
import {
  PaymentRequest,
  PaymentResponse,
  OrderHistoryResponse,
  Order,
  Payment,
} from '@agentic-commerce/shared-types';
import { validateMandateForTransaction } from '../utils/mandateCheck';

const API_URL = 'https://agenticcommerce-production.up.railway.app/api';

export const paymentService = {
  async processPayment(
    request: PaymentRequest,
    agentId?: string,
    skipMandateCheck: boolean = false,
    transactionAmount?: number,
    mandateToken?: string,
    mandateTokens?: Array<{ mandateId: string; mandateToken: string; productId?: string }>
  ): Promise<PaymentResponse> {
    // Validate mandate if agent is involved
    if (!skipMandateCheck && agentId) {
      try {
        const isValid = await validateMandateForTransaction(agentId, transactionAmount);
        if (!isValid) {
          console.warn('Mandate validation failed, proceeding with payment anyway');
          // Don't block payment - let backend handle final validation
        }
      } catch (error) {
        console.warn('Mandate validation error, proceeding with payment:', error);
        // Don't block payment on mandate service errors
      }
    }

    // Include mandate token(s) in the payment request for backend validation
    // Ensure paymentMethod is a string (enum may not serialize correctly in RN bundle)
    const method = request.paymentMethod;
    const paymentPayload = {
      ...request,
      paymentMethod: typeof method === 'string' ? method : 'vrp_mandate',
      ...(mandateToken && { mandateToken }),
      ...(mandateTokens && mandateTokens.length > 0 && { mandateTokens }),
    };

    const token = await storageService.getToken();
    const response = await axios.post(`${API_URL}/payments`, paymentPayload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = response?.data?.data;
    if (!data) {
      throw new Error('Invalid payment response from server');
    }
    return data;
  },

  async getOrderHistory(page: number = 1, limit: number = 10): Promise<OrderHistoryResponse> {
    const token = await storageService.getToken();
    const response = await axios.get(`${API_URL}/payments/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page, limit },
    });
    return response.data.data;
  },

  async getOrderById(orderId: string): Promise<{ order: Order; payment: Payment | null }> {
    const token = await storageService.getToken();
    const response = await axios.get(`${API_URL}/payments/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },
};
