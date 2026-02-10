-- Migration: Admin Users for Role-Based Access Control
-- Supports three roles: super_admin, merchant_admin, merchant_operator

CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('super_admin', 'merchant_admin', 'merchant_operator')),
    merchant_id     UUID REFERENCES merchants(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
    last_login_at   TIMESTAMPTZ,
    created_by      UUID REFERENCES admin_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_admin_merchant_scope CHECK (
        (role = 'super_admin' AND merchant_id IS NULL) OR
        (role IN ('merchant_admin', 'merchant_operator') AND merchant_id IS NOT NULL)
    )
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_merchant ON admin_users(merchant_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admin_users IS 'Admin users with role-based access control for the mandate service admin panel';
COMMENT ON COLUMN admin_users.role IS 'super_admin: platform-wide, merchant_admin: own merchant, merchant_operator: read-mostly for own merchant';
COMMENT ON COLUMN admin_users.merchant_id IS 'NULL for super_admin, required for merchant_admin and merchant_operator';
