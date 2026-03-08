-- Migration 009: Add Card-on-File (CoF) CIT/MIT columns to agent_mandates
-- Supports network token storage, CIT reference, and daily/period usage tracking.

ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS network_token TEXT;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS cit_transaction_id TEXT;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS daily_limit NUMERIC(12,2);
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS period_limit NUMERIC(12,2);
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS period_type TEXT CHECK (period_type IS NULL OR period_type IN ('daily','weekly','monthly'));
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS period_start_date DATE;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS amount_used_today NUMERIC(12,2) DEFAULT 0;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS amount_used_period NUMERIC(12,2) DEFAULT 0;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS last_daily_reset DATE;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS last_period_reset DATE;

CREATE INDEX IF NOT EXISTS idx_agent_mandates_network_token ON agent_mandates(network_token);
CREATE INDEX IF NOT EXISTS idx_agent_mandates_cit_transaction_id ON agent_mandates(cit_transaction_id);
