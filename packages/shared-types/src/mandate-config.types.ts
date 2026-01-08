// Mandate Module Configuration Types
// Modular system for configuring mandate flows with different payment gateways

export enum PaymentGatewayProvider {
  MOCK = 'mock',                    // Mock gateway for testing
  STRIPE = 'stripe',                // Stripe integration
  PAYPAL = 'paypal',                // PayPal integration
  SQUARE = 'square',                // Square integration
  CUSTOM = 'custom',                // Custom gateway integration
}

export interface MandateGatewayConfig {
  provider: PaymentGatewayProvider;
  enabled: boolean;

  // Gateway credentials (encrypted in production)
  credentials: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    webhookSecret?: string;
    customConfig?: Record<string, any>;
  };

  // Endpoints
  endpoints: {
    authorize?: string;
    capture?: string;
    refund?: string;
    webhook?: string;
  };

  // Feature flags
  features: {
    cartMandate: boolean;
    intentMandate: boolean;
    paymentMandate: boolean;
    autoApproval: boolean;
    webhooks: boolean;
  };

  // Limits and constraints
  limits: {
    maxTransactionAmount: number;
    dailyTransactionLimit: number;
    monthlyTransactionLimit: number;
    maxItemsPerDay?: number;
    maxIntentsPerDay?: number;
  };

  // UI customization
  ui: {
    brandColor?: string;
    logo?: string;
    displayName: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
}

export interface MandateSigningRequest {
  userId: string;
  agentId: string;
  agentName: string;
  mandateType: 'cart' | 'intent' | 'payment';

  // For cart mandate
  productIds?: string[];
  estimatedTotal?: number;

  // For intent mandate
  intentDescription?: string;
  intentCriteria?: {
    productName: string;
    maxPrice?: number;
    minRating?: number;
    requiredFeatures?: string[];
    triggerCondition?: string; // e.g., "when price drops below $1000"
  };

  // Constraints
  constraints: any;

  // Gateway info
  gatewayConfig: MandateGatewayConfig;
}

export interface MandateSigningResponse {
  success: boolean;
  mandateId?: string;
  signature?: string;
  timestamp: Date;
  expiresAt?: Date;
  message?: string;
}

export interface MandateUIConfig {
  showLegalText: boolean;
  requireExplicitConsent: boolean;
  showConstraints: boolean;
  showEstimatedCosts: boolean;
  allowEdit: boolean;
  confirmationRequired: boolean;
}

// Sample data types for demo
export interface SampleMandateData {
  userId: string;
  userName: string;
  mandates: Array<{
    type: 'cart' | 'intent' | 'payment';
    agentName: string;
    createdAt: Date;
    status: 'active' | 'pending' | 'suspended';
    usageCount: number;
    totalSpent: number;
  }>;
}

export interface SampleIntentData {
  id: string;
  userId: string;
  agentName: string;
  description: string;
  criteria: {
    productName: string;
    condition: string;
    targetPrice?: number;
  };
  status: 'pending' | 'approved' | 'triggered' | 'executed';
  createdAt: Date;
}
