import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from './storage.service';
import {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartResponse,
  CartItem,
  Cart,
} from '@agentic-commerce/shared-types';
import { AppConfig } from '../config/app.config';
import { openMandateApp } from '../utils/deepLink';

const API_URL = 'https://agenticcommerce-production.up.railway.app/api';
const DEMO_MODE = true;
const DEMO_CART_KEY = 'demo_cart_items';

/** Export for components that need to choose between local cart vs backend ACP */
export const isCartDemoMode = (): boolean => DEMO_MODE;

/**
 * Demo cart helpers - store cart items locally in AsyncStorage
 */
async function getDemoCartItems(): Promise<CartItem[]> {
  try {
    const data = await AsyncStorage.getItem(DEMO_CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveDemoCartItems(items: CartItem[]): Promise<void> {
  await AsyncStorage.setItem(DEMO_CART_KEY, JSON.stringify(items));
}

function buildDemoCart(items: CartItem[]): Cart {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
  return {
    id: 'demo_cart',
    userId: 'demo_user',
    items,
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const cartService = {
  async addToCart(request: AddToCartRequest): Promise<{ cartItem: CartItem; mandate?: { id: string; requiresApproval: boolean } }> {
    if (DEMO_MODE) {
      const items = await getDemoCartItems();

      // Check if item already in cart
      const existingIndex = items.findIndex(i => i.productId === request.productId);
      if (existingIndex >= 0) {
        items[existingIndex].quantity += request.quantity;
        items[existingIndex].updatedAt = new Date();
        await saveDemoCartItems(items);
        return { cartItem: items[existingIndex] };
      }

      const newItem: CartItem = {
        id: `cart_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: request.productId,
        productName: request.productName,
        productImage: request.productImage,
        quantity: request.quantity,
        price: request.price,
        mandateId: request.mandateId,
        mandateToken: request.mandateToken,
        userId: 'demo_user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      items.push(newItem);
      await saveDemoCartItems(items);
      return { cartItem: newItem };
    }

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
      const user = await storageService.getUser();
      await openMandateApp(response.data.mandate.id, { userId: user?.id, userName: user?.name });
    }

    return result;
  },

  async getCart(): Promise<CartResponse> {
    if (DEMO_MODE) {
      const items = await getDemoCartItems();
      const cart = buildDemoCart(items);
      return { cart, itemCount: items.length };
    }

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
    if (DEMO_MODE) {
      const items = await getDemoCartItems();
      const index = items.findIndex(i => i.id === itemId);
      if (index >= 0) {
        if (request.quantity !== undefined) {
          items[index].quantity = request.quantity;
        }
        items[index].updatedAt = new Date();
        await saveDemoCartItems(items);
        return items[index];
      }
      throw new Error('Cart item not found');
    }

    const token = await storageService.getToken();
    const response = await axios.put(`${API_URL}/cart/${itemId}`, request, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  async removeFromCart(itemId: string): Promise<void> {
    if (DEMO_MODE) {
      const items = await getDemoCartItems();
      const filtered = items.filter(i => i.id !== itemId);
      await saveDemoCartItems(filtered);
      return;
    }

    const token = await storageService.getToken();
    await axios.delete(`${API_URL}/cart/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async clearCart(): Promise<void> {
    if (DEMO_MODE) {
      await saveDemoCartItems([]);
      return;
    }

    const token = await storageService.getToken();
    await axios.post(`${API_URL}/cart/clear`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
