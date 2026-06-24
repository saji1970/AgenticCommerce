// Common types for the admin application

export type AdminRole = 'super_admin' | 'merchant_admin' | 'merchant_operator';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  merchantId: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  defaultMaxTransaction: number;
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  isBlocked: boolean;
  blockedAt?: string;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  businessName: string;
  email: string;
  website?: string;
  status: 'pending' | 'active' | 'suspended' | 'deactivated';
  tier: 'starter' | 'business' | 'enterprise';
  apiKey: string;
  apiSecret?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  settings: MerchantSettings;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

export interface MerchantSettings {
  supportsCartMandate: boolean;
  supportsIntentMandate: boolean;
  supportsPaymentMandate: boolean;
  maxTransactionAmount: number;
  dailyTransactionLimit: number;
  monthlyTransactionLimit: number;
  requiresWebhookVerification: boolean;
  requires2FA: boolean;
  allowedOrigins: string[];
  enableAutoApproval: boolean;
  autoApprovalThreshold: number;
  notifyOnMandateCreated: boolean;
  notifyOnIntentCreated: boolean;
  notifyOnPaymentExecuted: boolean;
}

export interface MerchantAgent {
  id: string;
  merchantId: string;
  agentId: string;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  agent?: AIAgent;
}

export interface AIAgent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  agentId: string;
  agentName: string;
  apiEndpoint?: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  agentId?: string;
  merchantId?: string;
  fingerprint: string;
  publicKeyPem: string;
  certificatePem: string;
  issuerDn?: string;
  subjectDn?: string;
  serialNumber?: string;
  notBefore: string;
  notAfter: string;
  caServerUrl?: string;
  isActive: boolean;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VrpConsent {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  paymentMethod: Record<string, unknown>;
  maxAmountPerPayment: number;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  expiryDate: string | null;
  amountUsedToday: number;
  amountUsedMonth: number;
  transactionsToday: number;
  lastDailyReset: string | null;
  lastMonthlyReset: string | null;
  consentToken: string | null;
  constraints: Record<string, unknown>;
  appMandateId: string | null;
  merchantId: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface VrpTransaction {
  id: string;
  consentId: string;
  userId: string;
  agentId: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  isExceptional: boolean;
  mandateId: string | null;
  appMandateId: string | null;
  cartId: string | null;
  intentId: string | null;
  merchantId: string | null;
  productInfo: Record<string, unknown>;
  createdAt: string;
  processedAt: string | null;
}

export interface Mandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: 'app' | 'cart' | 'intent' | 'payment';
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  constraints: Record<string, unknown>;
  parentMandateId?: string;
  paymentMethods?: unknown[];
  validFrom?: string;
  validUntil?: string;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
}

export interface MandateTimelineEntry {
  id: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  description: string;
  actorType: string;
  actorId: string;
  oldState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  variants: Record<string, unknown> | null;
}

export interface LinkedOrder {
  id: string;
  items: { productName?: string; name?: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface MandateDetail {
  mandate: Mandate;
  parentMandate: {
    id: string;
    type: string;
    status: string;
    agentName: string;
    constraints: Record<string, unknown>;
  } | null;
  childMandates: {
    id: string;
    type: string;
    status: string;
    constraints: Record<string, unknown>;
    createdAt: string;
  }[];
  timeline: MandateTimelineEntry[];
  transactions: {
    id: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
    processedAt: string | null;
  }[];
  purchaseIntents: {
    id: string;
    items: { productName?: string; name?: string; quantity: number; price: number }[];
    subtotal: number;
    tax: number;
    total: number;
    reasoning: string;
    status: string;
    createdAt: string;
    expiresAt: string | null;
    approvedAt: string | null;
    executedAt: string | null;
  }[];
  cartItems: CartItem[];
  linkedOrders: LinkedOrder[];
}

export interface TransactionDetail {
  transaction: Transaction;
  linkedMandate: {
    id: string;
    type: string;
    status: string;
    agentId: string;
    agentName: string;
    constraints: Record<string, unknown>;
    createdAt: string;
  } | null;
  parentMandate: {
    id: string;
    type: string;
    status: string;
    agentName: string;
    constraints: Record<string, unknown>;
  } | null;
  relatedMandates: {
    id: string;
    type: string;
    status: string;
    constraints: Record<string, unknown>;
    createdAt: string;
  }[];
}

export interface PurchaseIntent {
  id: string;
  userId: string;
  agentId: string;
  mandateId: string;
  items: IntentItem[];
  subtotal: number;
  tax: number;
  total: number;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  createdAt: string;
  expiresAt?: string;
  approvedAt?: string;
  executedAt?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
}

export interface IntentItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface AP2Transaction {
  id: string;
  userId: string;
  merchantId?: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  requestedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  userEmail?: string;
  merchantName?: string;
}

export interface Transaction {
  id: string;
  mandateId: string | null;
  userId: string;
  agentId: string | null;
  merchantId: string | null;
  type: 'payment' | 'refund' | 'authorization';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  gatewayTransactionId: string | null;
  gatewayResponse: Record<string, unknown>;
  metadata: Record<string, unknown>;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  adminEmail?: string;
  adminName?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalMerchants: number;
  totalAgents: number;
  mandates: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    total: number;
  };
  intents: {
    byStatus: Record<string, number>;
    total: number;
  };
  spending: {
    totalSpent: number;
  };
  activity: {
    recent: { date: string; count: number }[];
  };
  ap2: {
    totalTransactions: number;
    totalVolume: number;
  };
}

export interface AgentAction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  agentId: string;
  mandateId?: string;
  mandateType?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
}

export interface AdminSettingValue {
  value: unknown;
  description?: string;
}

export interface AdminSettings {
  general: {
    platform_name: AdminSettingValue;
    session_timeout_minutes: AdminSettingValue;
    default_page_size: AdminSettingValue;
    max_page_size: AdminSettingValue;
  };
  security: {
    require_mfa: AdminSettingValue;
    password_min_length: AdminSettingValue;
    password_require_special: AdminSettingValue;
    password_require_numbers: AdminSettingValue;
    max_login_attempts: AdminSettingValue;
    lockout_duration_minutes: AdminSettingValue;
    certificate_expiry_warning_days: AdminSettingValue;
  };
  notifications: {
    email_enabled: AdminSettingValue;
    email_from_address: AdminSettingValue;
    alert_on_new_merchant: AdminSettingValue;
    alert_on_certificate_expiry: AdminSettingValue;
    alert_on_suspicious_activity: AdminSettingValue;
    daily_summary_enabled: AdminSettingValue;
  };
  data: {
    audit_log_retention_days: AdminSettingValue;
    transaction_retention_days: AdminSettingValue;
    session_retention_days: AdminSettingValue;
    auto_backup_enabled: AdminSettingValue;
    backup_frequency_hours: AdminSettingValue;
    backup_retention_count: AdminSettingValue;
  };
}
