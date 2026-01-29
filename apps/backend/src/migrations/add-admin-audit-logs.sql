-- Migration: Add Admin Audit Logs Table
-- Description: Tracks all administrative actions for audit purposes
-- Date: 2026-01-28

-- Admin Audit Logs Table
-- Records all administrative actions for compliance and auditing
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for admin_audit_logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_type ON admin_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_id ON admin_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_action ON admin_audit_logs(admin_user_id, action);

-- Comments for documentation
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for all administrative actions';
COMMENT ON COLUMN admin_audit_logs.admin_user_id IS 'The admin user who performed the action';
COMMENT ON COLUMN admin_audit_logs.action IS 'Type of action performed (create, update, delete, block, unblock, revoke, etc.)';
COMMENT ON COLUMN admin_audit_logs.resource_type IS 'Type of resource affected (merchant, user, agent, certificate, etc.)';
COMMENT ON COLUMN admin_audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN admin_audit_logs.old_value IS 'Previous state of the resource (for updates)';
COMMENT ON COLUMN admin_audit_logs.new_value IS 'New state of the resource';
COMMENT ON COLUMN admin_audit_logs.ip_address IS 'IP address of the admin when action was performed';
