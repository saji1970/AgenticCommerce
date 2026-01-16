-- Create merchants table for configuration management
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  api_secret VARCHAR(255) NOT NULL,
  webhook_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_merchants_slug ON merchants(slug);
CREATE INDEX idx_merchants_api_key ON merchants(api_key);
CREATE INDEX idx_merchants_status ON merchants(status);

COMMENT ON TABLE merchants IS 'Merchants that can be added through configuration';
COMMENT ON COLUMN merchants.slug IS 'URL-friendly identifier for the merchant';
COMMENT ON COLUMN merchants.api_key IS 'Public API key for merchant authentication';
COMMENT ON COLUMN merchants.api_secret IS 'Secret key for merchant authentication (hashed)';
COMMENT ON COLUMN merchants.metadata IS 'Additional merchant configuration (logo, contact info, etc.)';
