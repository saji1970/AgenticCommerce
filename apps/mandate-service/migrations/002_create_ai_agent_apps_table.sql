-- Create AI agent apps table for configuration management
CREATE TABLE IF NOT EXISTS ai_agent_apps (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_agent_apps_slug ON ai_agent_apps(slug);
CREATE INDEX idx_ai_agent_apps_agent_id ON ai_agent_apps(agent_id);
CREATE INDEX idx_ai_agent_apps_status ON ai_agent_apps(status);

COMMENT ON TABLE ai_agent_apps IS 'AI agent applications that can be added through configuration';
COMMENT ON COLUMN ai_agent_apps.slug IS 'URL-friendly identifier for the agent app';
COMMENT ON COLUMN ai_agent_apps.agent_id IS 'Unique identifier for the agent (used in mandates)';
COMMENT ON COLUMN ai_agent_apps.capabilities IS 'Array of agent capabilities (e.g., ["cart", "intent", "payment"])';
COMMENT ON COLUMN ai_agent_apps.metadata IS 'Additional agent configuration (icon, version, etc.)';
