// Mandate Types (AP2 Standards)
export interface IntentMandate {
  id: string;
  userId: string;
  intent: string; // User's shopping intent/requirement
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CartMandate {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  intentMandateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  store: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  imageUrl?: string;
}

export interface PaymentMandate {
  id: string;
  userId: string;
  cartMandateId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'authorized' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface PriceRule {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    products?: Product[];
    mandates?: {
      intent?: IntentMandate;
      cart?: CartMandate;
      payment?: PaymentMandate;
    };
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  store: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  imageUrl?: string;
  url?: string;
  location?: 'online' | 'in_store' | 'both';
}

export interface AppConfig {
  apiBaseUrl: string;
  enablePriceAlerts: boolean;
  enableInStoreSearch: boolean;
  defaultCurrency: string;
  supportedStores: string[];
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

