// OpenAI Agentic Commerce Protocol (ACP) Specification Types
// Based on OpenAI's ACP standard for AI agent e-commerce interactions

export enum OpenAIACPVersion {
  V1 = '1.0',
  V2 = '2.0',
}

// ============================================================================
// OpenAI ACP Authorization Types
// ============================================================================

export enum ACPAuthorizationType {
  CART = 'cart',                    // Cart management authorization
  CHECKOUT = 'checkout',            // Checkout authorization
  PURCHASE = 'purchase',            // Direct purchase authorization
  SUBSCRIPTION = 'subscription',    // Subscription management
}

export interface ACPAuthorization {
  id: string;
  userId: string;
  agentId: string;
  type: ACPAuthorizationType;
  status: 'pending' | 'active' | 'suspended' | 'revoked';

  // Scope of authorization
  scope: {
    actions: string[];              // e.g., ['add_to_cart', 'update_quantity']
    maxAmount?: number;             // Maximum transaction amount
    categories?: string[];          // Allowed product categories
    merchants?: string[];           // Allowed merchants
  };

  // Validity period
  validFrom: Date;
  validUntil?: Date;

  // Metadata
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    deviceId?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OpenAI ACP Transaction Types
// ============================================================================

export enum ACPTransactionType {
  ADD_TO_CART = 'cart.add',
  REMOVE_FROM_CART = 'cart.remove',
  UPDATE_CART = 'cart.update',
  CHECKOUT_INITIATE = 'checkout.initiate',
  CHECKOUT_COMPLETE = 'checkout.complete',
  PURCHASE_DIRECT = 'purchase.direct',
  REFUND_REQUEST = 'refund.request',
  SUBSCRIPTION_CREATE = 'subscription.create',
  SUBSCRIPTION_CANCEL = 'subscription.cancel',
}

export interface ACPTransaction {
  id: string;
  authorizationId: string;
  userId: string;
  agentId: string;
  type: ACPTransactionType;

  // Transaction details
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    currency: string;
    metadata?: Record<string, any>;
  }>;

  amount?: number;
  currency: string;

  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  // Agent reasoning
  reasoning: string;
  confidence?: number;              // 0-1 confidence score

  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;

  // Error handling
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };

  metadata: Record<string, any>;
}

// ============================================================================
// OpenAI ACP Action Request/Response
// ============================================================================

export interface ACPActionRequest {
  // Protocol version
  version: OpenAIACPVersion;

  // Authorization
  authorizationId: string;
  agentId: string;

  // Action details
  action: ACPTransactionType;

  // Request payload
  payload: {
    items?: Array<{
      productId: string;
      quantity?: number;
      price?: number;
      variants?: Record<string, string>;
    }>;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    shippingAddress?: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
    metadata?: Record<string, any>;
  };

  // Agent context
  context: {
    reasoning: string;
    confidence: number;
    userIntent: string;
    conversationId?: string;
  };

  // Request metadata
  requestId: string;
  timestamp: string;
  signature?: string;                // Optional HMAC signature
}

export interface ACPActionResponse {
  // Request reference
  requestId: string;

  // Result
  success: boolean;
  transactionId?: string;

  // Response data
  data?: {
    cart?: {
      id: string;
      items: Array<{
        id: string;
        name: string;
        quantity: number;
        price: number;
      }>;
      subtotal: number;
      tax: number;
      total: number;
    };
    order?: {
      id: string;
      status: string;
      total: number;
      trackingNumber?: string;
    };
    message?: string;
  };

  // Error details
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };

  // Validation
  validation?: {
    requiresApproval: boolean;
    warnings?: string[];
    suggestions?: string[];
  };

  timestamp: string;
}

// ============================================================================
// OpenAI ACP Webhook Events
// ============================================================================

export enum ACPWebhookEvent {
  AUTHORIZATION_CREATED = 'authorization.created',
  AUTHORIZATION_APPROVED = 'authorization.approved',
  AUTHORIZATION_REVOKED = 'authorization.revoked',

  TRANSACTION_INITIATED = 'transaction.initiated',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',

  CART_UPDATED = 'cart.updated',
  CHECKOUT_STARTED = 'checkout.started',
  PURCHASE_COMPLETED = 'purchase.completed',
}

export interface ACPWebhookPayload {
  event: ACPWebhookEvent;
  version: OpenAIACPVersion;

  data: {
    authorization?: ACPAuthorization;
    transaction?: ACPTransaction;
    user?: {
      id: string;
      email?: string;
    };
    agent?: {
      id: string;
      name: string;
    };
  };

  timestamp: string;
  signature: string;
}

// ============================================================================
// OpenAI ACP Configuration
// ============================================================================

export interface ACPConfiguration {
  version: OpenAIACPVersion;
  enabled: boolean;

  // Endpoints
  endpoints: {
    authorize: string;
    action: string;
    webhook: string;
  };

  // Authentication
  authentication: {
    apiKey: string;
    secretKey: string;
    signatureRequired: boolean;
  };

  // Features
  features: {
    cartOperations: boolean;
    checkoutFlow: boolean;
    directPurchase: boolean;
    subscriptionManagement: boolean;
  };

  // Limits
  limits: {
    maxTransactionAmount: number;
    dailyTransactionLimit: number;
    rateLimitPerMinute: number;
  };

  // Behavior
  behavior: {
    requireUserApproval: boolean;
    approvalThreshold?: number;
    autoRetry: boolean;
    maxRetries: number;
  };
}

// ============================================================================
// Protocol Comparison Types
// ============================================================================

export enum CommerceProtocol {
  AP2 = 'ap2',                      // Our custom AP2 protocol
  OPENAI_ACP = 'openai_acp',        // OpenAI's ACP specification
}

export interface ProtocolCapabilities {
  protocol: CommerceProtocol;
  version: string;

  capabilities: {
    cartManagement: boolean;
    intentBased: boolean;
    autonomousPayment: boolean;
    subscriptions: boolean;
    webhooks: boolean;
    analytics: boolean;
  };

  security: {
    authentication: string[];       // e.g., ['api_key', 'hmac', 'oauth']
    encryption: boolean;
    replayProtection: boolean;
  };

  compliance: {
    pciCompliant: boolean;
    gdprCompliant: boolean;
    standards: string[];            // e.g., ['PCI-DSS', 'SOC2']
  };
}

export interface ProtocolSelection {
  userId: string;
  selectedProtocol: CommerceProtocol;
  configuration: ACPConfiguration | any;  // AP2 config or ACP config
  activatedAt: Date;
  lastUsedAt?: Date;
}

// ============================================================================
// Unified Protocol Interface
// ============================================================================

export interface UnifiedCommerceAction {
  protocol: CommerceProtocol;
  action: string;                   // Protocol-specific action type
  userId: string;
  agentId: string;
  authorizationId: string;

  payload: Record<string, any>;
  context: {
    reasoning: string;
    confidence?: number;
    userIntent?: string;
  };

  metadata: Record<string, any>;
}

export interface UnifiedCommerceResponse {
  protocol: CommerceProtocol;
  success: boolean;
  transactionId: string;

  data: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };

  requiresApproval: boolean;
  timestamp: Date;
}
