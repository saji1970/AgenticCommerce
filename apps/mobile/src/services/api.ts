import axios, { AxiosInstance } from 'axios';
import { getConfig, isDemoMode } from '../config';
import {
  Product,
  IntentMandate,
  CartMandate,
  PaymentMandate,
  PriceRule,
  ChatMessage,
} from '../types';
import {
  demoProducts,
  demoIntentMandates,
  demoCartMandates,
  demoPriceRules,
  getDemoChatResponse,
} from './demoData';
import { v4 as uuidv4 } from 'uuid';

class AgenticCommerceAPI {
  public client: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
  }

  // Set auth token
  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Chat/AI Agent endpoints
  async sendMessage(message: string, conversationId?: string): Promise<ChatMessage> {
    if (isDemoMode()) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getDemoChatResponse(message);
    }

    try {
      const response = await this.client.post('/agent/chat', {
        message,
        conversationId,
      });
      return response.data;
    } catch (error) {
      // If Railway backend fails, fall back to demo if enabled
      if (process.env.EXPO_PUBLIC_FALLBACK_TO_DEMO === 'true') {
        console.warn('Railway backend error, using demo response:', error);
        return getDemoChatResponse(message);
      }
      throw error;
    }
  }

  // Product Search
  async searchProducts(query: string, filters?: {
    stores?: string[];
    maxPrice?: number;
    minPrice?: number;
    inStore?: boolean;
  }): Promise<Product[]> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      let results = [...demoProducts];
      
      // Apply filters
      if (filters?.maxPrice) {
        results = results.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters?.minPrice) {
        results = results.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters?.stores && filters.stores.length > 0) {
        results = results.filter((p) => filters.stores!.includes(p.store));
      }
      if (filters?.inStore !== undefined) {
        results = results.filter((p) => 
          filters.inStore ? p.location === 'in_store' || p.location === 'both' : true
        );
      }
      
      // Filter by query
      const lowerQuery = query.toLowerCase();
      results = results.filter((p) => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery)
      );
      
      return results;
    }

    const response = await this.client.post('/agent/search', {
      query,
      filters,
    });
    return response.data.products || [];
  }

  async compareProducts(productIds: string[]): Promise<Product[]> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return demoProducts.filter((p) => productIds.includes(p.id));
    }

    const response = await this.client.post('/agent/compare', {
      productIds,
    });
    return response.data.products || [];
  }

  // Mandate Management
  async createIntentMandate(intent: string): Promise<IntentMandate> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mandate: IntentMandate = {
        id: uuidv4(),
        userId: 'demo-user',
        intent,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mandate;
    }

    const response = await this.client.post('/mandates/intent', {
      intent,
    });
    return response.data;
  }

  async getIntentMandates(): Promise<IntentMandate[]> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...demoIntentMandates];
    }

    const response = await this.client.get('/mandates/intent');
    return response.data;
  }

  async createCartMandate(items: CartMandate['items'], intentMandateId?: string): Promise<CartMandate> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const mandate: CartMandate = {
        id: uuidv4(),
        userId: 'demo-user',
        items,
        totalAmount,
        currency: 'USD',
        status: 'pending',
        intentMandateId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mandate;
    }

    const response = await this.client.post('/mandates/cart', {
      items,
      intentMandateId,
    });
    return response.data;
  }

  async getCartMandates(): Promise<CartMandate[]> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...demoCartMandates];
    }

    const response = await this.client.get('/mandates/cart');
    return response.data;
  }

  async createPaymentMandate(cartMandateId: string, paymentMethod: string): Promise<PaymentMandate> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const cart = demoCartMandates.find((c) => c.id === cartMandateId);
      const mandate: PaymentMandate = {
        id: uuidv4(),
        userId: 'demo-user',
        cartMandateId,
        amount: cart?.totalAmount || 0,
        currency: cart?.currency || 'USD',
        paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mandate;
    }

    const response = await this.client.post('/mandates/payment', {
      cartMandateId,
      paymentMethod,
    });
    return response.data;
  }

  // Price Rules/Alerts
  async createPriceRule(productId: string, productName: string, targetPrice: number): Promise<PriceRule> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const product = demoProducts.find((p) => p.id === productId);
      const rule: PriceRule = {
        id: uuidv4(),
        productId,
        productName,
        targetPrice,
        currentPrice: product?.price || 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      return rule;
    }

    const response = await this.client.post('/rules/price', {
      productId,
      productName,
      targetPrice,
    });
    return response.data;
  }

  async getPriceRules(): Promise<PriceRule[]> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...demoPriceRules];
    }

    const response = await this.client.get('/rules/price');
    return response.data;
  }

  async deletePriceRule(ruleId: string): Promise<void> {
    if (isDemoMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }

    await this.client.delete(`/rules/price/${ruleId}`);
  }
}

export const api = new AgenticCommerceAPI();

