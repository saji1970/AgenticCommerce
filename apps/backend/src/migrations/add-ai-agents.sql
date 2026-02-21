-- Migration: Add AI Agents Table
-- Description: Creates table for storing AI agent app configurations
-- Date: 2026-01-29

-- AI Agents Table
-- Stores registered AI agent applications that can request mandates
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  api_endpoint VARCHAR(512),
  api_key VARCHAR(255),
  capabilities JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for AI Agents
CREATE INDEX IF NOT EXISTS idx_ai_agents_slug ON ai_agents(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_id ON ai_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(status) WHERE status = 'active';

-- Comments for documentation
COMMENT ON TABLE ai_agents IS 'Registered AI agent applications that can request mandates from users';
COMMENT ON COLUMN ai_agents.name IS 'Display name for the agent in admin panel';
COMMENT ON COLUMN ai_agents.slug IS 'URL-friendly identifier for routing';
COMMENT ON COLUMN ai_agents.agent_id IS 'Unique technical identifier used in API calls';
COMMENT ON COLUMN ai_agents.agent_name IS 'User-facing name shown in the mandate app';
COMMENT ON COLUMN ai_agents.api_endpoint IS 'Webhook URL for mandate/transaction callbacks';
COMMENT ON COLUMN ai_agents.api_key IS 'Secret key for authenticating agent API calls';
COMMENT ON COLUMN ai_agents.capabilities IS 'JSON array of capabilities: cart, intent, payment, search, etc.';
COMMENT ON COLUMN ai_agents.status IS 'Agent status: active, inactive, or suspended';
COMMENT ON COLUMN ai_agents.metadata IS 'Additional agent-specific configuration';

-- Insert default shopping agent used by mobile app
INSERT INTO ai_agents (name, slug, agent_id, agent_name, description, capabilities, status)
VALUES (
  'Shopping Assistant',
  'shopping-assistant',
  'default-shopping-agent',
  'Shopping Assistant',
  'AI-powered shopping assistant that helps users find products, manage carts, track prices, and execute purchases within authorized limits.',
  '["cart", "intent", "payment", "search", "recommend"]',
  'active'
) ON CONFLICT (agent_id) DO NOTHING;

-- Insert NLP search agent used by AI chat/NLP search feature
INSERT INTO ai_agents (name, slug, agent_id, agent_name, description, capabilities, status)
VALUES (
  'NLP Search Agent',
  'nlp-search-agent',
  'nlp-search-agent',
  'NLP Search Agent',
  'AI agent that handles natural language product searches and creates purchase intents automatically.',
  '["intent", "search"]',
  'active'
) ON CONFLICT (agent_id) DO NOTHING;
