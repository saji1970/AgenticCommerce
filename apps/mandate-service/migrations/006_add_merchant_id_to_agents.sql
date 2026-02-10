-- Migration 006: Add merchant_id to ai_agent_apps
-- Links agents to merchants for proper scoping

ALTER TABLE ai_agent_apps ADD COLUMN merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_agent_apps_merchant_id ON ai_agent_apps(merchant_id);
