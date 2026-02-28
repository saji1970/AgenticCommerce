-- VRP (Variable Recurring Payment) Consent Tables
-- Run against the payment-gateway database

CREATE TABLE IF NOT EXISTS vrp_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','revoked','expired')),
  -- Payment config
  payment_method JSONB NOT NULL,
  -- Limits
  max_amount_per_payment NUMERIC(12,2) NOT NULL,
  daily_limit NUMERIC(12,2),
  monthly_limit NUMERIC(12,2),
  expiry_date TIMESTAMP WITH TIME ZONE,
  -- Usage tracking
  amount_used_today NUMERIC(12,2) DEFAULT 0,
  amount_used_month NUMERIC(12,2) DEFAULT 0,
  transactions_today INT DEFAULT 0,
  last_daily_reset DATE,
  last_monthly_reset DATE,
  -- Token
  consent_token TEXT,
  -- Metadata
  constraints JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_vrp_consents_user_id ON vrp_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_vrp_consents_agent_id ON vrp_consents(agent_id);
CREATE INDEX IF NOT EXISTS idx_vrp_consents_status ON vrp_consents(status);

CREATE TABLE IF NOT EXISTS vrp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES vrp_consents(id),
  user_id UUID NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  transaction_id VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_vrp_transactions_consent_id ON vrp_transactions(consent_id);
CREATE INDEX IF NOT EXISTS idx_vrp_transactions_user_id ON vrp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vrp_transactions_status ON vrp_transactions(status);
