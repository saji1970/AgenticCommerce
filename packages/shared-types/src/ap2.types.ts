// Agentic Protocol 2 (AP2) - Acquirer Bank Integration Types
// Enables payment gateways and acquirer banks to support AI agent transactions

import { MandateType, MandateStatus } from './agentic-commerce.types';

// ============================================================================
// Merchant Registration & API Keys
// ============================================================================

export enum MerchantStatus {
  PENDING = 'pending',           // Registration pending approval
  ACTIVE = 'active',             // Active and can process transactions
  SUSPENDED = 'suspended',       // Temporarily suspended
  DEACTIVATED = 'deactivated',   // Permanently deactivated
}

export enum MerchantTier {
  STARTER = 'starter',           // Basic features, lower limits
  BUSINESS = 'business',         // Enhanced features, higher limits
  ENTERPRISE = 'enterprise',     // Full features, custom limits
}

export interface Merchant {
  id: string;
  name: string;
  businessName: string;
  email: string;
  website?: string;
  status: MerchantStatus;
  tier: MerchantTier;
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  webhookSecret?: string;
  settings: MerchantSettings;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
}

export interface MerchantSettings {
  // Mandate support flags
  supportsCartMandate: boolean;
  supportsIntentMandate: boolean;
  supportsPaymentMandate: boolean;

  // Transaction limits
  maxTransactionAmount: number;
  dailyTransactionLimit: number;
  monthlyTransactionLimit: number;

  // Security settings
  requiresWebhookVerification: boolean;
  requires2FA: boolean;
  allowedOrigins: string[];

  // Feature flags
  enableAutoApproval: boolean;
  autoApprovalThreshold: number;

  // Notification preferences
  notifyOnMandateCreated: boolean;
  notifyOnIntentCreated: boolean;
  notifyOnPaymentExecuted: boolean;
}

export interface CreateMerchantRequest {
  name: string;
  businessName: string;
  email: string;
  website?: string;
  tier: MerchantTier;
  webhookUrl?: string;
}

export interface MerchantApiKey {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  createdAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// AP2 Transaction Types
// ============================================================================

export enum AP2TransactionType {
  CART_ADD = 'cart_add',
  CART_UPDATE = 'cart_update',
  CART_REMOVE = 'cart_remove',
  INTENT_CREATE = 'intent_create',
  INTENT_APPROVE = 'intent_approve',
  INTENT_REJECT = 'intent_reject',
  PAYMENT_EXECUTE = 'payment_execute',
  PAYMENT_REFUND = 'payment_refund',
}

export enum AP2TransactionStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface AP2Transaction {
  id: string;
  merchantId: string;
  userId: string;
  agentId: string;
  mandateId: string;
  type: AP2TransactionType;
  status: AP2TransactionStatus;
  amount: number;
  currency: string;
  metadata: any;
  requestedAt: Date;
  authorizedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  gatewayTransactionId?: string;
}

// ============================================================================
// AP2 Authorization & Verification
// ============================================================================

export interface AP2AuthorizationRequest {
  merchantId: string;
  userId: string;
  agentId: string;
  mandateId: string;
  transactionType: AP2TransactionType;
  amount?: number;
  metadata: any;
  signature: string;  // HMAC signature for request verification
  timestamp: number;  // Unix timestamp for replay protection
}

export interface AP2AuthorizationResponse {
  authorized: boolean;
  transactionId: string;
  message?: string;
  constraints?: {
    maxAmount?: number;
    expiresAt?: Date;
    requiresApproval?: boolean;
  };
}

// ============================================================================
// Webhook Events
// ============================================================================

export enum AP2WebhookEvent {
  MANDATE_CREATED = 'mandate.created',
  MANDATE_APPROVED = 'mandate.approved',
  MANDATE_SUSPENDED = 'mandate.suspended',
  MANDATE_REVOKED = 'mandate.revoked',
  MANDATE_EXPIRED = 'mandate.expired',

  INTENT_CREATED = 'intent.created',
  INTENT_APPROVED = 'intent.approved',
  INTENT_REJECTED = 'intent.rejected',
  INTENT_EXECUTED = 'intent.executed',
  INTENT_EXPIRED = 'intent.expired',

  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',

  CART_UPDATED = 'cart.updated',
}

export interface AP2WebhookPayload {
  event: AP2WebhookEvent;
  merchantId: string;
  data: any;
  timestamp: Date;
  signature: string;  // HMAC signature for webhook verification
}

export interface AP2WebhookDelivery {
  id: string;
  merchantId: string;
  event: AP2WebhookEvent;
  payload: AP2WebhookPayload;
  url: string;
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

// ============================================================================
// AP2 Gateway API Request/Response Types
// ============================================================================

export interface AP2CartOperationRequest {
  mandateId: string;
  agentId: string;
  operation: 'add' | 'update' | 'remove';
  productId: string;
  productName?: string;
  quantity?: number;
  price?: number;
  reasoning: string;
  signature: string;
  timestamp: number;
}

export interface AP2IntentOperationRequest {
  mandateId: string;
  agentId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  reasoning: string;
  signature: string;
  timestamp: number;
}

export interface AP2PaymentOperationRequest {
  mandateId: string;
  agentId: string;
  intentId: string;
  paymentMethod: string;
  amount: number;
  reasoning: string;
  signature: string;
  timestamp: number;
}

export interface AP2OperationResponse {
  success: boolean;
  transactionId: string;
  message?: string;
  data?: any;
}

// ============================================================================
// AP2 Mandate Verification
// ============================================================================

export interface AP2MandateVerificationRequest {
  mandateId: string;
  agentId: string;
  operation: AP2TransactionType;
  amount?: number;
  signature: string;
  timestamp: number;
}

export interface AP2MandateVerificationResponse {
  valid: boolean;
  mandate?: {
    id: string;
    type: MandateType;
    status: MandateStatus;
    constraints: any;
    validUntil?: Date;
  };
  reason?: string;
  remainingLimits?: {
    dailySpending?: number;
    monthlySpending?: number;
    transactionsToday?: number;
  };
}

// ============================================================================
// AP2 Analytics & Reporting
// ============================================================================

export interface AP2MerchantAnalytics {
  merchantId: string;
  period: {
    from: Date;
    to: Date;
  };
  totalTransactions: number;
  totalVolume: number;
  byType: Record<AP2TransactionType, number>;
  byStatus: Record<AP2TransactionStatus, number>;
  averageTransactionValue: number;
  topAgents: Array<{
    agentId: string;
    agentName: string;
    transactionCount: number;
    totalVolume: number;
  }>;
  mandateStats: {
    activeCartMandates: number;
    activeIntentMandates: number;
    activePaymentMandates: number;
  };
}

// ============================================================================
// AP2 Error Codes
// ============================================================================

export enum AP2ErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED_REQUEST = 'EXPIRED_REQUEST',
  MANDATE_NOT_FOUND = 'MANDATE_NOT_FOUND',
  MANDATE_INACTIVE = 'MANDATE_INACTIVE',
  MANDATE_EXPIRED = 'MANDATE_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  INVALID_TRANSACTION_TYPE = 'INVALID_TRANSACTION_TYPE',
  MERCHANT_SUSPENDED = 'MERCHANT_SUSPENDED',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
}

export interface AP2Error {
  code: AP2ErrorCode;
  message: string;
  details?: any;
}
