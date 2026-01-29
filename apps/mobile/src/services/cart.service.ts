import axios from 'axios';
import { storageService } from './storage.service';
import {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartResponse,
  CartItem,
} from '@agentic-commerce/shared-types';
import { AppConfig } from '../config/app.config';
import { openMandateApp } from '../utils/deepLink';

const API_URL = 'https://agenticcommerce-production.up.railway.app/api';

export const cartService = {
  async addToCart(request: AddToCartRequest): Promise<{ cartItem: CartItem; mandate?: { id: string; requiresApproval: boolean } }> {
    const token = await storageService.getToken();
    
    // Add default agent info if not provided
    const defaultAgent = AppConfig.getDefaultAgent();
    const requestWithAgent = {
      ...request,
      agentId: request.agentId || defaultAgent.id,
      agentName: request.agentName || defaultAgent.name,
    };

    const response = await axios.post(`${API_URL}/cart`, requestWithAgent, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result: { cartItem: CartItem; mandate?: { id: string; requiresApproval: boolean } } = {
      cartItem: response.data.data,
    };

    // If mandate requires approval, open Mandate app
    if (response.data.mandate?.requiresApproval && response.data.mandate.id) {
      result.mandate = response.data.mandate;
      await openMandateApp(response.data.mandate.id);
    }

    return result;
  },

  async getCart(): Promise<CartResponse> {
    const token = await storageService.getToken();
    const response = await axios.get(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async updateCartItem(
    itemId: string,
    request: UpdateCartItemRequest
  ): Promise<CartItem> {
    const token = await storageService.getToken();
    const response = await axios.put(`${API_URL}/cart/${itemId}`, request, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async removeFromCart(itemId: string): Promise<void> {
    const token = await storageService.getToken();
    await axios.delete(`${API_URL}/cart/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async clearCart(): Promise<void> {
    const token = await storageService.getToken();
    await axios.post(`${API_URL}/cart/clear`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
