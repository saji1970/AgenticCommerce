/**
 * Payment Gateway Interface
 * All payment gateway adapters must implement this interface
 */

export interface PaymentGatewayConfig {
  apiKey: string;
  apiSecret?: string;
  webhookSecret?: string;
  environment?: 'test' | 'production';
  [key: string]: any; // Allow additional gateway-specific config
}

export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'bank_account' | 'digital_wallet' | 'upi' | 'other';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  metadata?: Record<string, any>;
}

export interface CustomerInfo {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: boolean;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret?: string;
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export enum PaymentIntentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface SetupIntentRequest {
  customerId: string;
  paymentMethodTypes?: string[];
  metadata?: Record<string, string>;
}

export interface SetupIntentResponse {
  id: string;
  clientSecret: string;
  status: string;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  currency: string;
}

export interface VirtualCardRequest {
  customerId: string;
  amount: number;
  currency: string;
  spendingLimits?: {
    amount: number;
    interval: 'per_authorization' | 'daily' | 'weekly' | 'monthly';
  }[];
  metadata?: Record<string, string>;
}

export interface VirtualCardResponse {
  id: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cvv?: string; // Only available immediately after creation
  status: 'active' | 'inactive' | 'cancelled';
}

/**
 * Main Payment Gateway Interface
 */
export interface IPaymentGateway {
  /**
   * Gateway identifier
   */
  readonly name: string;

  /**
   * Initialize the gateway with configuration
   */
  initialize(config: PaymentGatewayConfig): Promise<void>;

  /**
   * Create a payment intent
   */
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;

  /**
   * Confirm a payment intent
   */
  confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;

  /**
   * Cancel a payment intent
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;

  /**
   * Get payment intent details
   */
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;

  /**
   * Create a setup intent for saving payment methods
   */
  createSetupIntent(request: SetupIntentRequest): Promise<SetupIntentResponse>;

  /**
   * Create a customer
   */
  createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerInfo>;

  /**
   * Get customer details
   */
  getCustomer(customerId: string): Promise<CustomerInfo>;

  /**
   * Update customer
   */
  updateCustomer(customerId: string, data: Partial<CustomerInfo>): Promise<CustomerInfo>;

  /**
   * Get payment methods for a customer
   */
  getPaymentMethods(customerId: string, type?: string): Promise<PaymentMethodInfo[]>;

  /**
   * Attach payment method to customer
   */
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethodInfo>;

  /**
   * Detach payment method from customer
   */
  detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }>;

  /**
   * Create a refund
   */
  refundPayment(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Create a virtual card (if supported)
   */
  createVirtualCard?(request: VirtualCardRequest): Promise<VirtualCardResponse>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string | Buffer): any;
}
