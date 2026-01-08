-- Create agent_mandates table
CREATE TABLE IF NOT EXISTS agent_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('cart', 'intent', 'payment')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked', 'expired')),
  constraints JSONB NOT NULL,
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

CREATE TRIGGER update_agent_mandates_updated_at
  BEFORE UPDATE ON agent_mandates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create purchase_intents table
CREATE TABLE IF NOT EXISTS purchase_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  mandate_id UUID NOT NULL REFERENCES agent_mandates(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  reasoning TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_intents_user_id ON purchase_intents(user_id);
CREATE INDEX idx_purchase_intents_agent_id ON purchase_intents(agent_id);
CREATE INDEX idx_purchase_intents_mandate_id ON purchase_intents(mandate_id);
CREATE INDEX idx_purchase_intents_status ON purchase_intents(status);
CREATE INDEX idx_purchase_intents_expires_at ON purchase_intents(expires_at);

CREATE TRIGGER update_purchase_intents_updated_at
  BEFORE UPDATE ON purchase_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create agent_actions table (audit log)
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  mandate_id UUID REFERENCES agent_mandates(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('cart', 'intent', 'payment')),
  resource_id UUID,
  metadata JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_actions_user_id ON agent_actions(user_id);
CREATE INDEX idx_agent_actions_agent_id ON agent_actions(agent_id);
CREATE INDEX idx_agent_actions_mandate_id ON agent_actions(mandate_id);
CREATE INDEX idx_agent_actions_timestamp ON agent_actions(timestamp DESC);
CREATE INDEX idx_agent_actions_action ON agent_actions(action);

-- Create mandate_usage_stats table
CREATE TABLE IF NOT EXISTS mandate_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES agent_mandates(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  actions_count INTEGER NOT NULL DEFAULT 0,
  successful_actions INTEGER NOT NULL DEFAULT 0,
  failed_actions INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mandate_id, date)
);

CREATE INDEX idx_mandate_usage_stats_mandate_id ON mandate_usage_stats(mandate_id);
CREATE INDEX idx_mandate_usage_stats_date ON mandate_usage_stats(date DESC);

CREATE TRIGGER update_mandate_usage_stats_updated_at
  BEFORE UPDATE ON mandate_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
