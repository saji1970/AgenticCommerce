import { AgentMandate, Merchant, AIAgentApp } from './mandate-service.client';

// Demo User ID - can be customized
export const DEMO_USER_ID = 'demo-user-123';

// Demo Merchants
export const demoMerchants: Merchant[] = [
  {
    id: 'merchant-1',
    name: 'TechStore Pro',
    slug: 'techstore-pro',
    description: 'Premium electronics and gadgets retailer',
    status: 'active',
    apiKey: 'demo-api-key-1',
    webhookUrl: 'https://techstore-pro.com/webhooks',
    metadata: {
      category: 'electronics',
      region: 'US',
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'merchant-2',
    name: 'Fashion Forward',
    slug: 'fashion-forward',
    description: 'Trendy clothing and accessories',
    status: 'active',
    apiKey: 'demo-api-key-2',
    webhookUrl: 'https://fashion-forward.com/webhooks',
    metadata: {
      category: 'fashion',
      region: 'US',
    },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'merchant-3',
    name: 'Home Essentials',
    slug: 'home-essentials',
    description: 'Home improvement and decor products',
    status: 'active',
    apiKey: 'demo-api-key-3',
    metadata: {
      category: 'home',
      region: 'US',
    },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo AI Agent Apps
export const demoAgentApps: AIAgentApp[] = [
  {
    id: 'agent-app-1',
    name: 'Shopping Assistant Pro',
    slug: 'shopping-assistant-pro',
    description: 'AI-powered shopping assistant for e-commerce',
    agentId: 'agent-1',
    agentName: 'ShoppingBot',
    apiEndpoint: 'https://api.shoppingbot.ai/v1',
    capabilities: ['cart_management', 'product_search', 'price_comparison', 'checkout'],
    status: 'active',
    metadata: {
      version: '2.1.0',
      category: 'shopping',
    },
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent-app-2',
    name: 'Payment Helper',
    slug: 'payment-helper',
    description: 'Intelligent payment processing assistant',
    agentId: 'agent-2',
    agentName: 'PayBot',
    apiEndpoint: 'https://api.paybot.ai/v1',
    capabilities: ['payment_processing', 'transaction_management', 'fraud_detection'],
    status: 'active',
    metadata: {
      version: '1.5.2',
      category: 'payment',
    },
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent-app-3',
    name: 'Smart Cart Manager',
    slug: 'smart-cart-manager',
    description: 'Automated cart management and checkout optimization',
    agentId: 'agent-3',
    agentName: 'CartBot',
    apiEndpoint: 'https://api.cartbot.ai/v1',
    capabilities: ['cart_management', 'checkout', 'order_tracking'],
    status: 'active',
    metadata: {
      version: '3.0.1',
      category: 'cart',
    },
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo Mandates
export const demoMandates: AgentMandate[] = [
  {
    id: 'mandate-1',
    userId: DEMO_USER_ID,
    agentId: 'agent-1',
    agentName: 'ShoppingBot',
    type: 'cart',
    status: 'active',
    constraints: {
      maxAmount: 5000,
      currency: 'USD',
      allowedMerchants: ['merchant-1', 'merchant-2'],
      maxItems: 50,
    },
    validFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mandate-2',
    userId: DEMO_USER_ID,
    agentId: 'agent-2',
    agentName: 'PayBot',
    type: 'payment',
    status: 'active',
    constraints: {
      maxAmount: 10000,
      currency: 'USD',
      allowedPaymentMethods: ['credit_card', 'paypal'],
      requireConfirmation: true,
    },
    validFrom: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mandate-3',
    userId: DEMO_USER_ID,
    agentId: 'agent-1',
    agentName: 'ShoppingBot',
    type: 'intent',
    status: 'pending',
    constraints: {
      maxAmount: 2000,
      currency: 'USD',
      allowedCategories: ['electronics', 'fashion'],
    },
    validFrom: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mandate-4',
    userId: DEMO_USER_ID,
    agentId: 'agent-3',
    agentName: 'CartBot',
    type: 'cart',
    status: 'suspended',
    constraints: {
      maxAmount: 3000,
      currency: 'USD',
      allowedMerchants: ['merchant-3'],
    },
    validFrom: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mandate-5',
    userId: DEMO_USER_ID,
    agentId: 'agent-2',
    agentName: 'PayBot',
    type: 'payment',
    status: 'revoked',
    constraints: {
      maxAmount: 5000,
      currency: 'USD',
    },
    validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mandate-6',
    userId: DEMO_USER_ID,
    agentId: 'agent-1',
    agentName: 'ShoppingBot',
    type: 'cart',
    status: 'expired',
    constraints: {
      maxAmount: 1000,
      currency: 'USD',
    },
    validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Get demo mandates filtered by user ID and optional filters
 */
export function getDemoMandates(
  userId: string,
  status?: string,
  type?: string
): AgentMandate[] {
  let mandates = demoMandates.filter((m) => m.userId === userId);

  if (status) {
    mandates = mandates.filter((m) => m.status === status);
  }

  if (type) {
    mandates = mandates.filter((m) => m.type === type);
  }

  return mandates;
}

/**
 * Get a specific demo mandate by ID
 */
export function getDemoMandate(mandateId: string): AgentMandate | null {
  return demoMandates.find((m) => m.id === mandateId) || null;
}

/**
 * Update a demo mandate (simulates API call)
 */
export function updateDemoMandate(
  mandateId: string,
  updates: Partial<AgentMandate>
): AgentMandate | null {
  const mandate = demoMandates.find((m) => m.id === mandateId);
  if (!mandate) return null;

  Object.assign(mandate, updates, {
    updatedAt: new Date().toISOString(),
  });

  return { ...mandate };
}

/**
 * Get all demo merchants
 */
export function getDemoMerchants(): Merchant[] {
  return [...demoMerchants];
}

/**
 * Get all demo agent apps
 */
export function getDemoAgentApps(activeOnly?: boolean): AIAgentApp[] {
  if (activeOnly) {
    return demoAgentApps.filter((app) => app.status === 'active');
  }
  return [...demoAgentApps];
}
