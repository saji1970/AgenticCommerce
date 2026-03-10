-- Migration 010: Add checkout mandate columns to agent_mandates
-- These columns support checkout payment mandates stored in the mandate-service
-- (previously stored as VRP consents in the payment-gateway)

ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS consent_token TEXT;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS transactions_today INTEGER DEFAULT 0;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS last_monthly_reset DATE;
