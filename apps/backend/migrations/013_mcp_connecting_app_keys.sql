-- API keys for apps that call POST /api/mcp/evaluate-payment-options without an end-user JWT
-- (e.g. server-side shopping connectors). Full key is shown once on create; store revoked_at to disable.

CREATE TABLE IF NOT EXISTS mcp_connecting_app_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_connecting_app_keys_active
  ON mcp_connecting_app_keys (api_key)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE mcp_connecting_app_keys IS 'Client API keys for Card MCP HTTP proxy (evaluate-payment-options)';
COMMENT ON COLUMN mcp_connecting_app_keys.api_key IS 'Opaque secret prefix mcpc_; send as X-Connecting-App-Key or Bearer mcpc_...';
