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
    skipMandateCheck: boolean = false
  ): Promise<PaymentResponse> {
    // Validate mandate if agent is involved
    if (!skipMandateCheck && agentId) {
      const isValid = await validateMandateForTransaction(agentId, request.totalAmount);
      if (!isValid) {
        throw new Error(
          'No valid payment mandate found. Please register and approve a mandate first.'
        );
      }
    }

    const token = await storageService.getToken();
    const response = await axios.post(`${API_URL}/payments`, request, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
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
