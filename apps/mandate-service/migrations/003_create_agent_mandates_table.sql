-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create agent_mandates table for Agentic Commerce Mandate Service
-- Note: user_id is stored as UUID string (no foreign key since this is a separate service)
CREATE TABLE IF NOT EXISTS agent_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- User ID from main backend (no FK since separate service)
  agent_id VARCHAR(255) NOT NULL, -- References ai_agent_apps.agent_id
  agent_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('cart', 'intent', 'payment')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked', 'expired')),
  constraints JSONB NOT NULL DEFAULT '{}',
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_mandates_user_id ON agent_mandates(user_id);
CREATE INDEX idx_agent_mandates_agent_id ON agent_mandates(agent_id);
CREATE INDEX idx_agent_mandates_status ON agent_mandates(status);
CREATE INDEX idx_agent_mandates_type ON agent_mandates(type);
CREATE INDEX idx_agent_mandates_user_agent ON agent_mandates(user_id, agent_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_mandates_updated_at ON agent_mandates;
CREATE TRIGGER update_agent_mandates_updated_at
  BEFORE UPDATE ON agent_mandates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agent_mandates IS 'AI agent mandates for payment transactions - managed by mandate service';
COMMENT ON COLUMN agent_mandates.user_id IS 'User ID from main backend system (UUID string)';
COMMENT ON COLUMN agent_mandates.agent_id IS 'Agent ID from ai_agent_apps table';
COMMENT ON COLUMN agent_mandates.type IS 'Mandate type: cart, intent, or payment';
COMMENT ON COLUMN agent_mandates.constraints IS 'JSON constraints (maxTransactionAmount, dailySpendingLimit, etc.)';
