import axios from 'axios';
import { getToken } from './auth.service';
import {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartResponse,
  CartItem,
} from '@agentic-commerce/shared-types';

const API_URL = 'https://agenticcommerce-production.up.railway.app/api';

export const cartService = {
  async addToCart(request: AddToCartRequest): Promise<CartItem> {
    const token = await getToken();
    const response = await axios.post(`${API_URL}/cart`, request, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async getCart(): Promise<CartResponse> {
    const token = await getToken();
    const response = await axios.get(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async updateCartItem(
    itemId: string,
    request: UpdateCartItemRequest
  ): Promise<CartItem> {
    const token = await getToken();
    const response = await axios.put(`${API_URL}/cart/${itemId}`, request, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async removeFromCart(itemId: string): Promise<void> {
    const token = await getToken();
    await axios.delete(`${API_URL}/cart/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async clearCart(): Promise<void> {
    const token = await getToken();
    await axios.post(`${API_URL}/cart/clear`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
