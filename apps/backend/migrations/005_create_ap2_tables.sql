-- ============================================================================
-- AP2 (Agentic Protocol 2) Database Schema
-- Supports acquirer bank integration for agentic commerce
-- ============================================================================

-- Merchants Table
-- Stores merchant registrations and API credentials
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  website VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  api_key VARCHAR(255) NOT NULL UNIQUE,
  api_secret VARCHAR(255) NOT NULL,
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),

  -- Settings stored as JSONB for flexibility
  settings JSONB NOT NULL DEFAULT '{
    "supportsCartMandate": true,
    "supportsIntentMandate": true,
    "supportsPaymentMandate": true,
    "maxTransactionAmount": 10000,
    "dailyTransactionLimit": 50000,
    "monthlyTransactionLimit": 500000,
    "requiresWebhookVerification": true,
    "requires2FA": false,
    "allowedOrigins": [],
    "enableAutoApproval": false,
    "autoApprovalThreshold": 100,
    "notifyOnMandateCreated": true,
    "notifyOnIntentCreated": true,
    "notifyOnPaymentExecuted": true
  }'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE
);

-- AP2 Transactions Table
-- Tracks all transactions processed through the AP2 gateway
CREATE TABLE IF NOT EXISTS ap2_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  mandate_id UUID NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Flexible metadata storage
  metadata JSONB,

  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  authorized_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  gateway_transaction_id VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AP2 Webhook Deliveries Table
-- Tracks webhook delivery attempts for reliability
CREATE TABLE IF NOT EXISTS ap2_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,

  -- Full payload stored for retry attempts
  payload JSONB NOT NULL,

  url VARCHAR(500) NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,

  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Response from webhook endpoint
  response_status INTEGER,
  response_body TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Merchant indexes
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_tier ON merchants(tier);
CREATE INDEX idx_merchants_api_key ON merchants(api_key);
CREATE INDEX idx_merchants_email ON merchants(email);

-- AP2 Transaction indexes
CREATE INDEX idx_ap2_transactions_merchant_id ON ap2_transactions(merchant_id);
CREATE INDEX idx_ap2_transactions_user_id ON ap2_transactions(user_id);
CREATE INDEX idx_ap2_transactions_mandate_id ON ap2_transactions(mandate_id);
CREATE INDEX idx_ap2_transactions_type ON ap2_transactions(type);
CREATE INDEX idx_ap2_transactions_status ON ap2_transactions(status);
CREATE INDEX idx_ap2_transactions_requested_at ON ap2_transactions(requested_at DESC);
CREATE INDEX idx_ap2_transactions_merchant_status ON ap2_transactions(merchant_id, status);

-- AP2 Webhook indexes
CREATE INDEX idx_ap2_webhooks_merchant_id ON ap2_webhook_deliveries(merchant_id);
CREATE INDEX idx_ap2_webhooks_event ON ap2_webhook_deliveries(event);
CREATE INDEX idx_ap2_webhooks_delivered ON ap2_webhook_deliveries(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_ap2_webhooks_pending ON ap2_webhook_deliveries(next_attempt_at)
  WHERE delivered_at IS NULL AND failed_at IS NULL;

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_ap2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION update_ap2_updated_at();

CREATE TRIGGER update_ap2_transactions_updated_at
  BEFORE UPDATE ON ap2_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_ap2_updated_at();

CREATE TRIGGER update_ap2_webhooks_updated_at
  BEFORE UPDATE ON ap2_webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_ap2_updated_at();

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- Merchant transaction summary view
CREATE OR REPLACE VIEW merchant_transaction_summary AS
SELECT
  m.id as merchant_id,
  m.name as merchant_name,
  m.status as merchant_status,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_transactions,
  SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END) as total_volume,
  AVG(CASE WHEN t.status = 'completed' THEN t.amount ELSE NULL END) as avg_transaction_value,
  MAX(t.requested_at) as last_transaction_at
FROM merchants m
LEFT JOIN ap2_transactions t ON m.id = t.merchant_id
GROUP BY m.id, m.name, m.status;

-- Daily transaction stats view
CREATE OR REPLACE VIEW daily_transaction_stats AS
SELECT
  merchant_id,
  DATE(requested_at) as transaction_date,
  type,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as daily_volume,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM ap2_transactions
GROUP BY merchant_id, DATE(requested_at), type;

-- ============================================================================
-- Sample Data (for development/testing)
-- ============================================================================

-- Insert a demo merchant for testing
INSERT INTO merchants (
  name,
  business_name,
  email,
  website,
  status,
  tier,
  api_key,
  api_secret,
  webhook_url,
  webhook_secret
) VALUES (
  'Demo Merchant',
  'Demo Commerce Inc.',
  'demo@merchant.com',
  'https://demo-merchant.com',
  'active',
  'business',
  'mk_test_demo_merchant_key_12345',
  'sk_test_demo_merchant_secret_67890',
  'https://demo-merchant.com/webhooks/ap2',
  'whsec_demo_webhook_secret_abcdef'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE merchants IS 'Stores merchant registrations for AP2 integration';
COMMENT ON TABLE ap2_transactions IS 'Tracks all transactions processed through AP2 gateway';
COMMENT ON TABLE ap2_webhook_deliveries IS 'Manages webhook delivery attempts with retry logic';

COMMENT ON COLUMN merchants.api_key IS 'Public API key for merchant authentication (starts with mk_)';
COMMENT ON COLUMN merchants.api_secret IS 'Secret key for request signing (starts with sk_)';
COMMENT ON COLUMN merchants.webhook_secret IS 'Secret for webhook signature verification (starts with whsec_)';
COMMENT ON COLUMN merchants.settings IS 'JSONB containing merchant-specific configuration and limits';

COMMENT ON COLUMN ap2_transactions.metadata IS 'Flexible JSONB field for transaction-specific data';
COMMENT ON COLUMN ap2_transactions.gateway_transaction_id IS 'External gateway transaction ID for reconciliation';

COMMENT ON COLUMN ap2_webhook_deliveries.payload IS 'Complete webhook payload for retry attempts';
COMMENT ON COLUMN ap2_webhook_deliveries.next_attempt_at IS 'Scheduled time for next delivery attempt (exponential backoff)';
