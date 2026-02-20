// Agentic Commerce Protocol (ACP) Types

export enum MandateType {
  APP = 'app',             // Master mandate per AI agent — defines purchase limits and payment methods
  CART = 'cart',           // Agent can manage shopping cart
  INTENT = 'intent',       // Agent can express purchase intent (requires approval)
  PAYMENT = 'payment',     // Agent can execute payments
}

export enum MandateStatus {
  PENDING = 'pending',     // Awaiting user approval
  ACTIVE = 'active',       // Currently active
  SUSPENDED = 'suspended', // Temporarily disabled
  REVOKED = 'revoked',     // Permanently cancelled
  EXPIRED = 'expired',     // Time limit reached
}

export enum AgentActionType {
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  UPDATE_CART = 'update_cart',
  EXPRESS_INTENT = 'express_intent',
  APPROVE_INTENT = 'approve_intent',
  REJECT_INTENT = 'reject_intent',
  EXECUTE_PAYMENT = 'execute_payment',
}

// Cart Mandate - Controls what agents can add to cart
export interface CartMandateConstraints {
  maxItemsPerDay?: number;
  maxItemValue?: number;
  allowedCategories?: string[];
  blockedCategories?: string[];
  allowedMerchants?: string[];
  requiresApproval?: boolean;
}

// Intent Mandate - Controls purchase intent expression
export interface IntentMandateConstraints {
  maxIntentsPerDay?: number;
  maxIntentValue?: number;
  autoApproveUnder?: number; // Auto-approve intents under this amount
  expiryHours?: number;       // Intent expires after X hours
}

// Payment Mandate - Controls autonomous payments
export interface PaymentMandateConstraints {
  maxTransactionAmount?: number;
  dailySpendingLimit?: number;
  monthlySpendingLimit?: number;
  allowedPaymentMethods?: string[];
  requiresTwoFactor?: boolean;
  allowedMerchants?: string[];
}

// App Mandate - Master mandate per AI agent
export interface AppMandateConstraints {
  maxTransactionAmount?: number;
  dailySpendingLimit?: number;
  monthlySpendingLimit?: number;
  allowedCategories?: string[];
  blockedCategories?: string[];
  allowedPaymentMethods?: string[];
  requiresTwoFactor?: boolean;
}

// Payment method info attached to App Mandates
export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay';
  label: string;
  last4?: string;
  email?: string;
  isDefault: boolean;
}

export interface Mandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: MandateType;
  status: MandateStatus;
  constraints: CartMandateConstraints | IntentMandateConstraints | PaymentMandateConstraints | AppMandateConstraints;
  parentMandateId?: string;
  paymentMethods?: PaymentMethodInfo[];
  validFrom: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

export interface PurchaseIntent {
  id: string;
  userId: string;
  agentId: string;
  mandateId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    variants?: Array<{
      name: string;
      value: string;
    }>;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  reasoning: string; // AI agent's reasoning for this purchase
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  approvedAt?: Date;
  rejectedAt?: Date;
  executedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentActionLog {
  id: string;
  userId: string;
  agentId: string;
  mandateId: string;
  action: AgentActionType;
  resourceType: 'cart' | 'intent' | 'payment' | 'app';
  resourceId?: string;
  metadata: any;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

export interface CreateMandateRequest {
  agentId: string;
  agentName: string;
  type: MandateType;
  constraints: CartMandateConstraints | IntentMandateConstraints | PaymentMandateConstraints | AppMandateConstraints;
  parentMandateId?: string;
  paymentMethods?: PaymentMethodInfo[];
  validUntil?: Date;
}

export interface UpdateMandateRequest {
  status?: MandateStatus;
  constraints?: CartMandateConstraints | IntentMandateConstraints | PaymentMandateConstraints | AppMandateConstraints;
  paymentMethods?: PaymentMethodInfo[];
  validUntil?: Date;
}

export interface AgentCartRequest {
  mandateId: string;
  agentId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  variants?: Array<{
    id: string;
    name: string;
    value: string;
    priceModifier?: number;
  }>;
  reasoning: string; // Why the agent is adding this item
}

export interface CreateIntentRequest {
  mandateId: string;
  agentId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    variants?: Array<{
      name: string;
      value: string;
    }>;
  }>;
  reasoning: string;
}

export interface AgentPaymentRequest {
  mandateId: string;
  agentId: string;
  intentId?: string; // Optional: link to approved intent
  paymentMethod: string;
  cardDetails?: any;
  paypalDetails?: any;
  reasoning: string;
}

export interface MandateUsageStats {
  mandateId: string;
  totalActions: number;
  actionsToday: number;
  totalSpent: number;
  spentToday: number;
  spentThisMonth: number;
  lastActionAt?: Date;
  successRate: number;
}
