-- Migration: User Public Keys and Mandate Signatures
-- Supports hardware-secured mandate signing with Secure Element

-- Create user_public_keys table
-- Stores public keys generated in Secure Element (iOS Secure Enclave / Android StrongBox)
CREATE TABLE IF NOT EXISTS user_public_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- User ID from main backend
  public_key_pem TEXT NOT NULL, -- Public key in PEM format
  key_algorithm VARCHAR(50) NOT NULL DEFAULT 'ECDSA-P256', -- ECC P-256
  key_id VARCHAR(255) NOT NULL UNIQUE, -- Unique identifier for the key
  device_id VARCHAR(255), -- Device identifier (optional)
  attestation_data JSONB, -- Hardware attestation data (proves key is in Secure Element)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT
);

CREATE INDEX idx_user_public_keys_user_id ON user_public_keys(user_id);
CREATE INDEX idx_user_public_keys_key_id ON user_public_keys(key_id);
CREATE INDEX idx_user_public_keys_device_id ON user_public_keys(device_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_public_keys_updated_at ON user_public_keys;
CREATE TRIGGER update_user_public_keys_updated_at
  BEFORE UPDATE ON user_public_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create mandate_signatures table
-- Stores signed mandate data with digital signatures
CREATE TABLE IF NOT EXISTS mandate_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL, -- References agent_mandates.id
  user_id UUID NOT NULL, -- User who signed
  public_key_id UUID NOT NULL REFERENCES user_public_keys(id) ON DELETE RESTRICT,
  
  -- Mandate data that was signed
  mandate_text TEXT NOT NULL, -- The full mandate text/contract
  mandate_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of mandate_text + timestamp
  
  -- Signature data
  signature_data TEXT NOT NULL, -- Base64-encoded digital signature
  signature_image_url TEXT, -- URL to stored signature image (optional)
  signature_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- When signature was created
  
  -- Verification data
  verified_at TIMESTAMP WITH TIME ZONE, -- When signature was verified
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
  verification_error TEXT, -- Error message if verification failed
  
  -- Metadata
  device_info JSONB, -- Device information (OS, model, etc.)
  biometric_type VARCHAR(50), -- 'face', 'fingerprint', 'pin', etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mandate_signatures_mandate_id ON mandate_signatures(mandate_id);
CREATE INDEX idx_mandate_signatures_user_id ON mandate_signatures(user_id);
CREATE INDEX idx_mandate_signatures_public_key_id ON mandate_signatures(public_key_id);
CREATE INDEX idx_mandate_signatures_verification_status ON mandate_signatures(verification_status);
CREATE INDEX idx_mandate_signatures_mandate_hash ON mandate_signatures(mandate_hash);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_mandate_signatures_updated_at ON mandate_signatures;
CREATE TRIGGER update_mandate_signatures_updated_at
  BEFORE UPDATE ON mandate_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add signature_id column to agent_mandates table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_mandates' AND column_name = 'signature_id'
  ) THEN
    ALTER TABLE agent_mandates ADD COLUMN signature_id UUID REFERENCES mandate_signatures(id) ON DELETE SET NULL;
    CREATE INDEX idx_agent_mandates_signature_id ON agent_mandates(signature_id);
  END IF;
END $$;

COMMENT ON TABLE user_public_keys IS 'Public keys from Secure Element for hardware-secured mandate signing';
COMMENT ON TABLE mandate_signatures IS 'Digital signatures for mandates with hardware-secured keys';
COMMENT ON COLUMN user_public_keys.public_key_pem IS 'Public key in PEM format (from Secure Element)';
COMMENT ON COLUMN user_public_keys.attestation_data IS 'Hardware attestation proving key is in Secure Element';
COMMENT ON COLUMN mandate_signatures.mandate_hash IS 'SHA-256 hash of mandate_text + timestamp (what was signed)';
COMMENT ON COLUMN mandate_signatures.signature_data IS 'Base64-encoded digital signature from Secure Element';
COMMENT ON COLUMN mandate_signatures.signature_image_url IS 'URL to signature image (visual record)';
