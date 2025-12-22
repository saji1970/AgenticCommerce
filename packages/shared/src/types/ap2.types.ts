/**
 * Google AP2 (Agent Payments Protocol) Type Definitions
 *
 * AP2 is an open protocol for secure agent-led payments across platforms.
 * Announced September 2025, developed with 60+ payment and technology companies.
 */

export type MandateType = 'intent' | 'cart';

export type MandateStatus = 'active' | 'expired' | 'completed' | 'revoked';

export type SignatureAlgorithm = 'ed25519' | 'ecdsa-sha256';

/**
 * Intent Mandate - Created when user first makes a request
 * Captures user's shopping requirements and constraints
 */
export interface IntentMandate {
  mandate_id: string;
  mandate_type: 'intent';
  user_id: string;
  request: string;
  constraints: {
    max_price: number;
    min_price?: number;
    valid_until: string; // ISO 8601 timestamp
    approved_merchants?: string[];
    blocked_merchants?: string[];
    categories?: string[];
    shipping_constraints?: {
      max_delivery_days?: number;
      required_shipping_methods?: string[];
    };
  };
  created_at: string; // ISO 8601 timestamp
  status: MandateStatus;
  metadata?: Record<string, any>;
}

/**
 * Cart Mandate - Created upon final approval before purchase
 * Locks in exact items, price, and terms
 */
export interface CartMandate {
  mandate_id: string;
  mandate_type: 'cart';
  user_id: string;
  intent_mandate_id: string;
  items: CartItem[];
  total_price: number;
  merchant: MerchantInfo;
  payment_method_id?: string;
  shipping_address?: ShippingAddress;
  created_at: string; // ISO 8601 timestamp
  status: MandateStatus;
  metadata?: Record<string, any>;
}

export interface CartItem {
  product_id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  merchant_sku?: string;
  attributes?: Record<string, any>;
}

export interface MerchantInfo {
  merchant_id: string;
  name: string;
  mcp_server_url?: string;
  contact_info?: {
    email?: string;
    phone?: string;
  };
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

/**
 * Signed Mandate - Cryptographically signed mandate with verification data
 */
export interface SignedMandate<T extends IntentMandate | CartMandate> {
  mandate: T;
  signature: string; // Base64 encoded signature
  public_key: string; // Base64 encoded public key
  algorithm: SignatureAlgorithm;
  signed_at: string; // ISO 8601 timestamp
}

/**
 * Mandate Verification Result
 */
export interface MandateVerificationResult {
  is_valid: boolean;
  verified_at: string;
  errors?: string[];
}

/**
 * Mandate Audit Event
 */
export interface MandateAuditEvent {
  event_id: string;
  mandate_id: string;
  mandate_type: MandateType;
  event_type: 'created' | 'signed' | 'verified' | 'executed' | 'revoked' | 'expired';
  user_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Payment Authorization with AP2 Mandate
 */
export interface AP2PaymentAuthorization {
  cart_mandate: SignedMandate<CartMandate>;
  payment_method_token: string;
  credential_provider: string; // e.g., 'stripe', 'paypal'
  authorization_timestamp: string;
  risk_assessment?: {
    score: number;
    factors: string[];
  };
}

/**
 * AP2 Transaction Result
 */
export interface AP2TransactionResult {
  transaction_id: string;
  mandate_id: string;
  status: 'success' | 'failed' | 'pending' | 'requires_action';
  amount: number;
  currency: string;
  merchant: MerchantInfo;
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
  receipt_url?: string;
}

/**
 * Mandate Constraint Validation Result
 */
export interface ConstraintValidationResult {
  is_valid: boolean;
  violations: {
    constraint: string;
    expected: any;
    actual: any;
    message: string;
  }[];
}

/**
 * Mandate Creation Request
 */
export interface CreateIntentMandateRequest {
  user_id: string;
  request: string;
  max_price: number;
  min_price?: number;
  time_limit_hours?: number;
  approved_merchants?: string[];
  blocked_merchants?: string[];
  categories?: string[];
}

export interface CreateCartMandateRequest {
  user_id: string;
  intent_mandate_id: string;
  items: CartItem[];
  total_price: number;
  merchant: MerchantInfo;
  payment_method_id?: string;
  shipping_address?: ShippingAddress;
}
