-- Create AI agents table for AgenticCommerce AI agent configuration
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  api_endpoint VARCHAR(500),
  api_key VARCHAR(255),
  capabilities JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_agents_slug ON ai_agents(slug);
CREATE INDEX idx_ai_agents_agent_id ON ai_agents(agent_id);
CREATE INDEX idx_ai_agents_status ON ai_agents(status);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_agents IS 'AI agent applications configured for AgenticCommerce mandate system';
COMMENT ON COLUMN ai_agents.slug IS 'URL-friendly identifier for the agent app';
COMMENT ON COLUMN ai_agents.agent_id IS 'Unique identifier for the agent (used in mandates)';
COMMENT ON COLUMN ai_agents.capabilities IS 'Array of agent capabilities (e.g., ["cart", "intent", "payment"])';
COMMENT ON COLUMN ai_agents.metadata IS 'Additional agent configuration (icon, version, config, etc.)';

-- Insert default AI agent for AgenticCommerce
INSERT INTO ai_agents (name, slug, description, agent_id, agent_name, capabilities, status, metadata)
VALUES (
  'AgenticCommerce AI',
  'agentic-commerce-ai',
  'Default AI agent for AgenticCommerce platform with full cart, intent, and payment capabilities',
  'agentic-commerce-ai',
  'AgenticCommerce AI',
  '["cart", "intent", "payment"]'::jsonb,
  'active',
  '{"version": "1.0.0", "provider": "anthropic", "model": "claude-sonnet-4"}'::jsonb
)
ON CONFLICT (agent_id) DO NOTHING;
