-- ============================================================================
-- AgenticCommerce Mandate Server - Full Schema Migration
-- All tables use UUID primary keys and timestamptz for time fields.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. MERCHANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS merchants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    business_name   TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    website         TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','suspended','deactivated')),
    tier            TEXT NOT NULL DEFAULT 'starter'
                    CHECK (tier IN ('starter','business','enterprise')),
    api_key         TEXT NOT NULL UNIQUE,
    api_secret_hash TEXT NOT NULL,                     -- bcrypt hash, never store plaintext
    webhook_url     TEXT,
    webhook_secret  TEXT,
    settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_api_key ON merchants(api_key);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_email ON merchants(email);

-- ============================================================================
-- 2. AI AGENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_agent_apps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID REFERENCES merchants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    agent_id        TEXT NOT NULL UNIQUE,              -- external-facing identifier
    agent_name      TEXT NOT NULL,
    public_key_pem  TEXT,                              -- agent's current signing key
    key_algorithm   TEXT DEFAULT 'Ed25519',
    key_rotated_at  TIMESTAMPTZ,
    previous_keys   JSONB DEFAULT '[]'::jsonb,         -- archived keys for signature verification
    api_endpoint    TEXT,
    capabilities    JSONB NOT NULL DEFAULT '[]'::jsonb,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','suspended','revoked')),
    suspended_at    TIMESTAMPTZ,
    suspended_reason TEXT,
    revoked_at      TIMESTAMPTZ,
    revoked_reason  TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_agent_id ON ai_agent_apps(agent_id);
CREATE INDEX idx_agents_merchant ON ai_agent_apps(merchant_id);
CREATE INDEX idx_agents_status ON ai_agent_apps(status);

-- ============================================================================
-- 3. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    phone_number    TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','deactivated')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. USER PUBLIC KEYS (from Secure Element / mobile devices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_public_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key_pem  TEXT NOT NULL,
    key_algorithm   TEXT NOT NULL DEFAULT 'Ed25519',
    key_id          TEXT NOT NULL UNIQUE,              -- fingerprint / identifier
    device_id       TEXT,
    attestation_data JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    revoked_at      TIMESTAMPTZ,
    revoked_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_public_keys_user ON user_public_keys(user_id);
CREATE INDEX idx_user_public_keys_key_id ON user_public_keys(key_id);

-- ============================================================================
-- 5. MANDATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS mandates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    agent_id        TEXT NOT NULL,                     -- references ai_agent_apps.agent_id
    merchant_id     UUID REFERENCES merchants(id),
    type            TEXT NOT NULL
                    CHECK (type IN ('cart','intent','payment')),
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','awaiting_consent','active','consumed','revoked','expired')),

    -- Constraints encoded as JSONB (validated at application level)
    constraints     JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Spending / frequency tracking
    max_amount          NUMERIC(12,2),
    daily_limit         NUMERIC(12,2),
    monthly_limit       NUMERIC(12,2),
    max_frequency       INT,                           -- max transactions per day
    amount_used         NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_used_today   NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_used_month   NUMERIC(12,2) NOT NULL DEFAULT 0,
    transactions_today  INT NOT NULL DEFAULT 0,
    last_reset_date     DATE,                          -- for daily counter reset
    last_month_reset    DATE,                          -- for monthly counter reset

    -- Cryptographic binding
    mandate_hash    TEXT,                              -- SHA-256 of canonical mandate content
    signature_id    UUID,                              -- FK to mandate_signatures

    -- Lifecycle timestamps
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,
    activated_at    TIMESTAMPTZ,
    consumed_at     TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    revoked_reason  TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mandates_user ON mandates(user_id);
CREATE INDEX idx_mandates_agent ON mandates(agent_id);
CREATE INDEX idx_mandates_status ON mandates(status);
CREATE INDEX idx_mandates_merchant ON mandates(merchant_id);

-- ============================================================================
-- 6. MANDATE SIGNATURES
-- ============================================================================
CREATE TABLE IF NOT EXISTS mandate_signatures (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id          UUID NOT NULL REFERENCES mandates(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    public_key_id       UUID REFERENCES user_public_keys(id),

    -- What was signed
    mandate_text        TEXT NOT NULL,                  -- human-readable mandate text shown to user
    mandate_hash        TEXT NOT NULL,                  -- SHA-256 of canonical mandate content
    signature_data      TEXT NOT NULL,                  -- base64-encoded digital signature
    signature_algorithm TEXT NOT NULL DEFAULT 'Ed25519',

    -- Optional drawn signature (SVG)
    signature_image_url TEXT,

    -- Verification metadata
    signature_timestamp TIMESTAMPTZ NOT NULL,
    verified_at         TIMESTAMPTZ,
    verification_status TEXT DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','failed','expired')),
    verification_error  TEXT,

    -- Device context
    device_info         JSONB,
    biometric_type      TEXT,                          -- 'fingerprint', 'face', 'none'

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signatures_mandate ON mandate_signatures(mandate_id);
CREATE INDEX idx_signatures_user ON mandate_signatures(user_id);

-- Back-reference from mandates
ALTER TABLE mandates ADD CONSTRAINT fk_mandate_signature
    FOREIGN KEY (signature_id) REFERENCES mandate_signatures(id);

-- ============================================================================
-- 7. PAYMENT AUTHORIZATION ARTIFACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_authorization_artifacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id          UUID NOT NULL REFERENCES mandates(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    agent_id            TEXT NOT NULL,
    merchant_id         UUID REFERENCES merchants(id),

    -- Authorization details
    amount              NUMERIC(12,2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    idempotency_key     TEXT NOT NULL UNIQUE,           -- prevents duplicate charges

    -- Cryptographic proof
    artifact_hash       TEXT NOT NULL,                  -- SHA-256 of canonical artifact content
    server_signature    TEXT NOT NULL,                  -- server-signed authorization
    signature_algorithm TEXT NOT NULL DEFAULT 'Ed25519',

    -- Status tracking
    status              TEXT NOT NULL DEFAULT 'issued'
                        CHECK (status IN ('issued','submitted','settled','failed','expired','voided')),

    -- Gateway integration
    gateway_provider    TEXT,
    gateway_tx_id       TEXT,
    gateway_response    JSONB,

    -- Lifecycle
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    settled_at          TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    failure_reason      TEXT,
    expires_at          TIMESTAMPTZ NOT NULL,           -- artifact has limited validity
    voided_at           TIMESTAMPTZ,
    voided_reason       TEXT,

    -- Callback tracking
    callback_url        TEXT,
    callback_status     TEXT DEFAULT 'pending'
                        CHECK (callback_status IN ('pending','delivered','failed','skipped')),
    callback_attempts   INT NOT NULL DEFAULT 0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_artifacts_mandate ON payment_authorization_artifacts(mandate_id);
CREATE INDEX idx_auth_artifacts_idempotency ON payment_authorization_artifacts(idempotency_key);
CREATE INDEX idx_auth_artifacts_status ON payment_authorization_artifacts(status);

-- ============================================================================
-- 8. SECURITY AUDIT LOG (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Actor identification
    actor_type      TEXT NOT NULL CHECK (actor_type IN ('user','agent','merchant','system')),
    actor_id        TEXT NOT NULL,
    actor_identity  TEXT,                              -- crypto fingerprint or email

    -- Event details
    event_type      TEXT NOT NULL,                     -- e.g. 'mandate.state_change', 'payment.authorized'
    event_category  TEXT NOT NULL                      -- 'mandate','payment','agent','merchant','security','auth'
                    CHECK (event_category IN ('mandate','payment','agent','merchant','security','auth')),
    severity        TEXT NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info','warning','critical')),

    -- References
    mandate_id      UUID,
    artifact_id     UUID,
    resource_type   TEXT,
    resource_id     TEXT,

    -- Payload
    description     TEXT NOT NULL,
    old_state       JSONB,
    new_state       JSONB,
    metadata        JSONB DEFAULT '{}'::jsonb,

    -- Request context
    ip_address      TEXT,
    user_agent      TEXT,
    request_id      TEXT,                              -- correlation ID

    -- Cryptographic binding (for tamper evidence)
    entry_hash      TEXT,                              -- SHA-256(previous_hash + this_entry)
    previous_hash   TEXT,                              -- hash chain link

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: no UPDATE or DELETE allowed via application code.
-- In production, use a RULE or TRIGGER to prevent modifications:
-- CREATE RULE no_update_audit AS ON UPDATE TO security_audit_log DO INSTEAD NOTHING;
-- CREATE RULE no_delete_audit AS ON DELETE FROM security_audit_log DO INSTEAD NOTHING;

CREATE INDEX idx_audit_actor ON security_audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_event ON security_audit_log(event_type);
CREATE INDEX idx_audit_mandate ON security_audit_log(mandate_id);
CREATE INDEX idx_audit_category ON security_audit_log(event_category);
CREATE INDEX idx_audit_severity ON security_audit_log(severity);
CREATE INDEX idx_audit_created ON security_audit_log(created_at);

-- ============================================================================
-- 9. NONCE TABLE (replay attack prevention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS used_nonces (
    nonce       TEXT PRIMARY KEY,
    actor_id    TEXT NOT NULL,
    used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_nonces_expires ON used_nonces(expires_at);

-- Periodic cleanup of expired nonces (run via cron or application timer)
-- DELETE FROM used_nonces WHERE expires_at < NOW();
