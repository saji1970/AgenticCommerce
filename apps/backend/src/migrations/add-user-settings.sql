-- Migration: Add User Settings Table
-- Description: Stores user settings with admin-configurable default limits
-- Date: 2026-01-28

-- User Settings Table
-- Stores user-specific settings and default limits configured by admin
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  default_max_transaction DECIMAL(10,2) DEFAULT 1000,
  default_daily_limit DECIMAL(10,2) DEFAULT 5000,
  default_monthly_limit DECIMAL(10,2) DEFAULT 50000,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_blocked ON user_settings(is_blocked) WHERE is_blocked = true;

-- Comments for documentation
COMMENT ON TABLE user_settings IS 'User-specific settings including admin-configurable default limits';
COMMENT ON COLUMN user_settings.default_max_transaction IS 'Default maximum transaction amount (user can override in mobile app)';
COMMENT ON COLUMN user_settings.default_daily_limit IS 'Default daily spending limit (user can override in mobile app)';
COMMENT ON COLUMN user_settings.default_monthly_limit IS 'Default monthly spending limit (user can override in mobile app)';
COMMENT ON COLUMN user_settings.is_blocked IS 'Whether the user is blocked by admin';
COMMENT ON COLUMN user_settings.blocked_reason IS 'Reason for blocking the user';
