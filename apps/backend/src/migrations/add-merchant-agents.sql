-- Migration: Add Merchant Agents Table
-- Description: Links merchants to their agentic apps (1:N relationship)
-- Date: 2026-01-28

-- Merchant Agents Table
-- Links merchants to AI agents with configuration
CREATE TABLE IF NOT EXISTS merchant_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, agent_id)
);

-- Indexes for merchant_agents
CREATE INDEX IF NOT EXISTS idx_merchant_agents_merchant_id ON merchant_agents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_agents_agent_id ON merchant_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_merchant_agents_active ON merchant_agents(is_active) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE merchant_agents IS 'Links merchants to AI agents they are authorized to use';
COMMENT ON COLUMN merchant_agents.config IS 'Custom configuration for this merchant-agent relationship';
COMMENT ON COLUMN merchant_agents.is_active IS 'Whether this merchant-agent relationship is currently active';
