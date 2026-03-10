-- Migration 011: Add checkout mandate columns to agent_mandates
-- Supports Card-on-File (CoF) and checkout payment mandates in mandate-service

-- CoF columns (may already exist from manual setup)
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS network_token TEXT;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS cit_transaction_id TEXT;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS daily_limit NUMERIC(12,2);
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS period_limit NUMERIC(12,2);
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS period_type VARCHAR(20);
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS period_start_date DATE;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS amount_used_today NUMERIC(12,2) DEFAULT 0;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS amount_used_period NUMERIC(12,2) DEFAULT 0;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS last_daily_reset DATE;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS last_period_reset DATE;

-- Checkout mandate columns (new)
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS consent_token TEXT;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS transactions_today INTEGER DEFAULT 0;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS last_monthly_reset DATE;

-- Add 'completed' to status CHECK if not already present
ALTER TABLE agent_mandates DROP CONSTRAINT IF EXISTS agent_mandates_status_check;
ALTER TABLE agent_mandates ADD CONSTRAINT agent_mandates_status_check
  CHECK (status IN ('pending', 'active', 'completed', 'suspended', 'revoked', 'expired'));
