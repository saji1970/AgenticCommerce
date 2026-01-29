// Common types for the admin application

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

export interface Mandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment';
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  constraints: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
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
