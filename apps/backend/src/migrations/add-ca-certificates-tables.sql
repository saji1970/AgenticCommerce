-- Migration: Add CA Certificates Tables
-- Description: Creates tables for storing CA certificates and server configurations
-- Date: 2026-01-27

-- CA Certificates Table
-- Stores client certificates issued by CA servers
CREATE TABLE IF NOT EXISTS ca_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  fingerprint VARCHAR(64) UNIQUE NOT NULL,
  public_key_pem TEXT NOT NULL,
  certificate_pem TEXT NOT NULL,
  issuer_dn VARCHAR(512),
  subject_dn VARCHAR(512),
  serial_number VARCHAR(128),
  not_before TIMESTAMP NOT NULL,
  not_after TIMESTAMP NOT NULL,
  ca_server_url VARCHAR(512),
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for CA Certificates
CREATE INDEX IF NOT EXISTS idx_ca_certs_fingerprint ON ca_certificates(fingerprint);
CREATE INDEX IF NOT EXISTS idx_ca_certs_user_id ON ca_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_ca_certs_active ON ca_certificates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ca_certs_expiry ON ca_certificates(not_after) WHERE is_active = true;

-- CA Server Configurations Table
-- Stores CA server connection settings (admin only)
CREATE TABLE IF NOT EXISTS ca_server_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  server_url VARCHAR(512) NOT NULL,
  api_key_encrypted TEXT,
  root_certificate_pem TEXT,
  server_public_key_pem TEXT,
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMP,
  health_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for active CA server config
CREATE INDEX IF NOT EXISTS idx_ca_server_configs_active ON ca_server_configs(is_active) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE ca_certificates IS 'Client certificates issued by CA servers for secure payload signing';
COMMENT ON TABLE ca_server_configs IS 'CA server connection configurations for certificate management';

COMMENT ON COLUMN ca_certificates.fingerprint IS 'SHA-256 fingerprint of the certificate (unique identifier)';
COMMENT ON COLUMN ca_certificates.is_active IS 'Whether the certificate is currently valid and usable';
COMMENT ON COLUMN ca_certificates.revoked_at IS 'Timestamp when certificate was revoked (if applicable)';

COMMENT ON COLUMN ca_server_configs.api_key_encrypted IS 'Encrypted API key for CA server authentication';
COMMENT ON COLUMN ca_server_configs.health_status IS 'Last health check result: connected, disconnected, error';
