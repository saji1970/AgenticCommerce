-- Admin Settings Table
-- Stores platform-wide configuration settings

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON admin_settings(category);

-- Insert default settings
INSERT INTO admin_settings (category, key, value, description) VALUES
-- General Settings
('general', 'platform_name', '"AgenticCommerce"', 'Platform display name'),
('general', 'session_timeout_minutes', '30', 'Session timeout in minutes'),
('general', 'default_page_size', '25', 'Default pagination page size'),
('general', 'max_page_size', '100', 'Maximum allowed page size'),

-- Security Settings
('security', 'require_mfa', 'false', 'Require MFA for admin users'),
('security', 'password_min_length', '12', 'Minimum password length'),
('security', 'password_require_special', 'true', 'Require special characters in passwords'),
('security', 'password_require_numbers', 'true', 'Require numbers in passwords'),
('security', 'max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('security', 'lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
('security', 'certificate_expiry_warning_days', '30', 'Days before certificate expiry to show warning'),

-- Notification Settings
('notifications', 'email_enabled', 'true', 'Enable email notifications'),
('notifications', 'email_from_address', '"admin@agenticcommerce.com"', 'From address for notification emails'),
('notifications', 'alert_on_new_merchant', 'true', 'Send alert when new merchant registers'),
('notifications', 'alert_on_certificate_expiry', 'true', 'Send alert when certificates are expiring'),
('notifications', 'alert_on_suspicious_activity', 'true', 'Send alert on suspicious activity detection'),
('notifications', 'daily_summary_enabled', 'false', 'Enable daily summary emails'),

-- Data Management Settings
('data', 'audit_log_retention_days', '365', 'Days to retain audit logs'),
('data', 'transaction_retention_days', '730', 'Days to retain transaction records'),
('data', 'session_retention_days', '90', 'Days to retain session data'),
('data', 'auto_backup_enabled', 'true', 'Enable automatic backups'),
('data', 'backup_frequency_hours', '24', 'Backup frequency in hours'),
('data', 'backup_retention_count', '30', 'Number of backups to retain')

ON CONFLICT (category, key) DO NOTHING;
