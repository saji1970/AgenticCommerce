-- Classify keys: agentic_api = connecting Agentic Commerce clients (AI / checkout agents), mcp_proxy = other MCP callers

ALTER TABLE mcp_connecting_app_keys
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'mcp_proxy';

COMMENT ON COLUMN mcp_connecting_app_keys.purpose IS 'agentic_api | mcp_proxy — same auth today; used in control plane and audits';
