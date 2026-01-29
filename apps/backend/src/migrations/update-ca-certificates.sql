-- Migration: Update CA Certificates Table
-- Description: Links certificates to agents and merchants
-- Date: 2026-01-28

-- Add agent_id column to link certificates to agents
ALTER TABLE ca_certificates
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id);

-- Add merchant_id column to link certificates to merchants
ALTER TABLE ca_certificates
  ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id);

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ca_certs_agent_id ON ca_certificates(agent_id);
CREATE INDEX IF NOT EXISTS idx_ca_certs_merchant_id ON ca_certificates(merchant_id);

-- Comments for documentation
COMMENT ON COLUMN ca_certificates.agent_id IS 'Optional link to the AI agent this certificate is associated with';
COMMENT ON COLUMN ca_certificates.merchant_id IS 'Optional link to the merchant this certificate is associated with';
