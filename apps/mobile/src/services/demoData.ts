import {
  Product,
  ChatMessage,
  IntentMandate,
  CartMandate,
  PaymentMandate,
  PriceRule,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// Demo/Mock data for testing without backend
export const demoProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'MacBook Pro 16" M3 Pro',
    description: 'Apple MacBook Pro with M3 Pro chip, 16GB RAM, 512GB SSD',
    price: 2499.99,
    currency: 'USD',
    store: 'apple',
    availability: 'in_stock',
    imageUrl: 'https://via.placeholder.com/300x300?text=MacBook+Pro',
    location: 'both',
  },
  {
    id: 'prod-2',
    name: 'MacBook Pro 16" M3 Pro',
    description: 'Apple MacBook Pro with M3 Pro chip, 16GB RAM, 512GB SSD',
    price: 2399.99,
    currency: 'USD',
    store: 'bestbuy',
    availability: 'in_stock',
    imageUrl: 'https://via.placeholder.com/300x300?text=MacBook+Pro',
    location: 'both',
  },
  {
    id: 'prod-3',
    name: 'Dell XPS 15',
    description: 'Dell XPS 15 Laptop, Intel i7, 16GB RAM, 512GB SSD',
    price: 1599.99,
    currency: 'USD',
    store: 'amazon',
    availability: 'in_stock',
    imageUrl: 'https://via.placeholder.com/300x300?text=Dell+XPS',
    location: 'online',
  },
  {
    id: 'prod-4',
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Wireless Noise Cancelling Headphones',
    price: 399.99,
    currency: 'USD',
    store: 'amazon',
    availability: 'in_stock',
    imageUrl: 'https://via.placeholder.com/300x300?text=Sony+Headphones',
    location: 'both',
  },
  {
    id: 'prod-5',
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Wireless Noise Cancelling Headphones',
    price: 379.99,
    currency: 'USD',
    store: 'bestbuy',
    availability: 'in_stock',
    imageUrl: 'https://via.placeholder.com/300x300?text=Sony+Headphones',
    location: 'in_store',
  },
];

export const demoIntentMandates: IntentMandate[] = [
  {
    id: uuidv4(),
    userId: 'user-1',
    intent: 'I need a new laptop under $2000 for software development',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    userId: 'user-1',
    intent: 'Find wireless headphones with noise cancellation',
    status: 'fulfilled',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const demoCartMandates: CartMandate[] = [
  {
    id: uuidv4(),
    userId: 'user-1',
    items: [
      {
        productId: 'prod-1',
        name: 'MacBook Pro 16" M3 Pro',
        price: 2499.99,
        quantity: 1,
        store: 'apple',
        availability: 'in_stock',
      },
    ],
    totalAmount: 2499.99,
    currency: 'USD',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const demoPriceRules: PriceRule[] = [
  {
    id: uuidv4(),
    productId: 'prod-4',
    productName: 'Sony WH-1000XM5 Headphones',
    targetPrice: 350.00,
    currentPrice: 399.99,
    status: 'active',
    createdAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: uuidv4(),
    productId: 'prod-3',
    productName: 'Dell XPS 15',
    targetPrice: 1400.00,
    currentPrice: 1599.99,
    status: 'active',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

// Demo chat responses
export const getDemoChatResponse = (userMessage: string): ChatMessage => {
  const lowerMessage = userMessage.toLowerCase();

  // Product search responses
  if (lowerMessage.includes('laptop') || lowerMessage.includes('computer') || lowerMessage.includes('macbook')) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: 'I found several laptops that match your search. Here are the best options with prices and availability:',
      timestamp: new Date().toISOString(),
      metadata: {
        products: demoProducts.filter((p) => 
          p.name.toLowerCase().includes('laptop') || 
          p.name.toLowerCase().includes('macbook') ||
          p.name.toLowerCase().includes('xps')
        ),
      },
    };
  }

  if (lowerMessage.includes('headphone') || lowerMessage.includes('headset')) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: 'I found some great noise-cancelling headphones for you:',
      timestamp: new Date().toISOString(),
      metadata: {
        products: demoProducts.filter((p) => p.name.toLowerCase().includes('headphone')),
      },
    };
  }

  // Price alert responses
  if (lowerMessage.includes('alert') || lowerMessage.includes('notify') || lowerMessage.includes('price drop')) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: 'I can help you set up a price alert! Just tell me which product and what price you\'re waiting for. For example: "Notify me when the Sony headphones drop below $350"',
      timestamp: new Date().toISOString(),
    };
  }

  // Mandate creation responses
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('cart')) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: 'I can help you add items to your cart. Which products would you like to purchase? I can create a cart mandate for you.',
      timestamp: new Date().toISOString(),
    };
  }

  // Default response
  return {
    id: uuidv4(),
    role: 'assistant',
    content: 'I can help you find products, compare prices, check availability, and set up price alerts. What would you like to search for?',
    timestamp: new Date().toISOString(),
  };
};

