import { pool } from '../config/database';

export interface AdminSetting {
  id: string;
  category: string;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSettingsMap {
  [category: string]: {
    [key: string]: {
      value: unknown;
      description?: string;
    };
  };
}

class AdminSettingsRepository {
  /**
   * Get all settings grouped by category
   */
  async getAll(): Promise<AdminSettingsMap> {
    try {
      const result = await pool.query(
        'SELECT * FROM admin_settings ORDER BY category, key'
      );

      const settings: AdminSettingsMap = {};
      for (const row of result.rows) {
        if (!settings[row.category]) {
          settings[row.category] = {};
        }
        settings[row.category][row.key] = {
          value: row.value,
          description: row.description,
        };
      }

      return settings;
    } catch (error: any) {
      // If table doesn't exist, return default settings
      if (error.code === '42P01') {
        return this.getDefaultSettings();
      }
      throw error;
    }
  }

  /**
   * Get settings by category
   */
  async getByCategory(category: string): Promise<Record<string, { value: unknown; description?: string }>> {
    try {
      const result = await pool.query(
        'SELECT * FROM admin_settings WHERE category = $1 ORDER BY key',
        [category]
      );

      const settings: Record<string, { value: unknown; description?: string }> = {};
      for (const row of result.rows) {
        settings[row.key] = {
          value: row.value,
          description: row.description,
        };
      }

      return settings;
    } catch (error: any) {
      if (error.code === '42P01') {
        const defaults = this.getDefaultSettings();
        return defaults[category] || {};
      }
      throw error;
    }
  }

  /**
   * Get a single setting
   */
  async get(category: string, key: string): Promise<unknown | null> {
    try {
      const result = await pool.query(
        'SELECT value FROM admin_settings WHERE category = $1 AND key = $2',
        [category, key]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].value;
    } catch (error: any) {
      if (error.code === '42P01') {
        const defaults = this.getDefaultSettings();
        return defaults[category]?.[key]?.value ?? null;
      }
      throw error;
    }
  }

  /**
   * Update a single setting
   */
  async update(category: string, key: string, value: unknown, updatedBy?: string): Promise<AdminSetting | null> {
    try {
      const result = await pool.query(
        `UPDATE admin_settings
         SET value = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
         WHERE category = $1 AND key = $2
         RETURNING *`,
        [category, key, JSON.stringify(value), updatedBy || null]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSetting(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn('[AdminSettingsRepository] Table does not exist');
        return null;
      }
      throw error;
    }
  }

  /**
   * Bulk update settings
   */
  async bulkUpdate(
    updates: Array<{ category: string; key: string; value: unknown }>,
    updatedBy?: string
  ): Promise<number> {
    try {
      let updatedCount = 0;

      for (const update of updates) {
        const result = await pool.query(
          `UPDATE admin_settings
           SET value = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
           WHERE category = $1 AND key = $2`,
          [update.category, update.key, JSON.stringify(update.value), updatedBy || null]
        );
        updatedCount += result.rowCount ?? 0;
      }

      return updatedCount;
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn('[AdminSettingsRepository] Table does not exist');
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get default settings (when table doesn't exist)
   */
  private getDefaultSettings(): AdminSettingsMap {
    return {
      general: {
        platform_name: { value: 'AgenticCommerce', description: 'Platform display name' },
        session_timeout_minutes: { value: 30, description: 'Session timeout in minutes' },
        default_page_size: { value: 25, description: 'Default pagination page size' },
        max_page_size: { value: 100, description: 'Maximum allowed page size' },
      },
      security: {
        require_mfa: { value: false, description: 'Require MFA for admin users' },
        password_min_length: { value: 12, description: 'Minimum password length' },
        password_require_special: { value: true, description: 'Require special characters' },
        password_require_numbers: { value: true, description: 'Require numbers' },
        max_login_attempts: { value: 5, description: 'Max failed login attempts' },
        lockout_duration_minutes: { value: 30, description: 'Account lockout duration' },
        certificate_expiry_warning_days: { value: 30, description: 'Certificate expiry warning days' },
      },
      notifications: {
        email_enabled: { value: true, description: 'Enable email notifications' },
        email_from_address: { value: 'admin@agenticcommerce.com', description: 'From address' },
        alert_on_new_merchant: { value: true, description: 'Alert on new merchant' },
        alert_on_certificate_expiry: { value: true, description: 'Alert on cert expiry' },
        alert_on_suspicious_activity: { value: true, description: 'Alert on suspicious activity' },
        daily_summary_enabled: { value: false, description: 'Daily summary emails' },
      },
      data: {
        audit_log_retention_days: { value: 365, description: 'Audit log retention days' },
        transaction_retention_days: { value: 730, description: 'Transaction retention days' },
        session_retention_days: { value: 90, description: 'Session retention days' },
        auto_backup_enabled: { value: true, description: 'Auto backup enabled' },
        backup_frequency_hours: { value: 24, description: 'Backup frequency hours' },
        backup_retention_count: { value: 30, description: 'Backup retention count' },
      },
    };
  }

  private mapRowToSetting(row: any): AdminSetting {
    return {
      id: row.id,
      category: row.category,
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const adminSettingsRepository = new AdminSettingsRepository();
