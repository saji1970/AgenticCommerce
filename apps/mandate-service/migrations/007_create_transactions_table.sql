-- Migration 007: Create transactions table

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID REFERENCES agent_mandates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  agent_id TEXT,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'refund', 'authorization')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  gateway_transaction_id TEXT,
  gateway_response JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_agent_id ON transactions(agent_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_mandate_id ON transactions(mandate_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();
