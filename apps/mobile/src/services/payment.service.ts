import axios from 'axios';
import { getToken } from './auth.service';
import {
  PaymentRequest,
  PaymentResponse,
  OrderHistoryResponse,
  Order,
  Payment,
} from '@agentic-commerce/shared-types';

const API_URL = 'https://agenticcommerce-production.up.railway.app/api';

export const paymentService = {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const token = await getToken();
    const response = await axios.post(`${API_URL}/payments`, request, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async getOrderHistory(page: number = 1, limit: number = 10): Promise<OrderHistoryResponse> {
    const token = await getToken();
    const response = await axios.get(`${API_URL}/payments/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page, limit },
    });
    return response.data.data;
  },

  async getOrderById(orderId: string): Promise<{ order: Order; payment: Payment | null }> {
    const token = await getToken();
    const response = await axios.get(`${API_URL}/payments/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },
};
