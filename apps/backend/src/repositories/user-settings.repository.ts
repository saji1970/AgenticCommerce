/**
 * User Settings Repository
 * Database operations for user settings and limits
 */

import { query } from '../config/database';
import crypto from 'crypto';

/**
 * User Settings entity
 */
export interface UserSettings {
  id: string;
  userId: string;
  defaultMaxTransaction: number;
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  isBlocked: boolean;
  blockedAt?: Date;
  blockedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update User Settings request
 */
export interface UpdateUserSettingsRequest {
  defaultMaxTransaction?: number;
  defaultDailyLimit?: number;
  defaultMonthlyLimit?: number;
}

export class UserSettingsRepository {
  /**
   * Get user settings by user ID
   */
  async getByUserId(userId: string): Promise<UserSettings | null> {
    try {
      const result = await query(
        `SELECT * FROM user_settings WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserSettings(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn('[UserSettingsRepository] Table does not exist');
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or get user settings
   */
  async getOrCreate(userId: string): Promise<UserSettings> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      return existing;
    }

    return this.create(userId);
  }

  /**
   * Create user settings with defaults
   */
  async create(userId: string): Promise<UserSettings> {
    const id = crypto.randomUUID();

    try {
      const result = await query(
        `INSERT INTO user_settings (id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [id, userId]
      );

      return this.mapRowToUserSettings(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn('[UserSettingsRepository] Table does not exist');
        return this.createMockUserSettings(id, userId);
      }
      throw error;
    }
  }

  /**
   * Update user settings (limits)
   */
  async updateSettings(userId: string, settings: UpdateUserSettingsRequest): Promise<UserSettings> {
    // Ensure settings exist
    await this.getOrCreate(userId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settings.defaultMaxTransaction !== undefined) {
      updates.push(`default_max_transaction = $${paramIndex++}`);
      values.push(settings.defaultMaxTransaction);
    }
    if (settings.defaultDailyLimit !== undefined) {
      updates.push(`default_daily_limit = $${paramIndex++}`);
      values.push(settings.defaultDailyLimit);
    }
    if (settings.defaultMonthlyLimit !== undefined) {
      updates.push(`default_monthly_limit = $${paramIndex++}`);
      values.push(settings.defaultMonthlyLimit);
    }

    if (updates.length === 0) {
      const current = await this.getByUserId(userId);
      return current!;
    }

    updates.push('updated_at = NOW()');
    values.push(userId);

    try {
      const result = await query(
        `UPDATE user_settings
         SET ${updates.join(', ')}
         WHERE user_id = $${paramIndex}
         RETURNING *`,
        values
      );

      return this.mapRowToUserSettings(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return this.createMockUserSettings(crypto.randomUUID(), userId);
      }
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, reason: string): Promise<UserSettings> {
    // Ensure settings exist
    await this.getOrCreate(userId);

    try {
      const result = await query(
        `UPDATE user_settings
         SET is_blocked = true, blocked_at = NOW(), blocked_reason = $2, updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId, reason]
      );

      return this.mapRowToUserSettings(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        const mock = this.createMockUserSettings(crypto.randomUUID(), userId);
        mock.isBlocked = true;
        mock.blockedAt = new Date();
        mock.blockedReason = reason;
        return mock;
      }
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<UserSettings> {
    // Ensure settings exist
    await this.getOrCreate(userId);

    try {
      const result = await query(
        `UPDATE user_settings
         SET is_blocked = false, blocked_at = NULL, blocked_reason = NULL, updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId]
      );

      return this.mapRowToUserSettings(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return this.createMockUserSettings(crypto.randomUUID(), userId);
      }
      throw error;
    }
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    const settings = await this.getByUserId(userId);
    return settings?.isBlocked || false;
  }

  /**
   * Get all blocked users
   */
  async getBlockedUsers(limit: number = 50, offset: number = 0): Promise<UserSettings[]> {
    try {
      const result = await query(
        `SELECT * FROM user_settings
         WHERE is_blocked = true
         ORDER BY blocked_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map((row) => this.mapRowToUserSettings(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  private createMockUserSettings(id: string, userId: string): UserSettings {
    const now = new Date();
    return {
      id,
      userId,
      defaultMaxTransaction: 1000,
      defaultDailyLimit: 5000,
      defaultMonthlyLimit: 50000,
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapRowToUserSettings(row: any): UserSettings {
    return {
      id: row.id,
      userId: row.user_id,
      defaultMaxTransaction: parseFloat(row.default_max_transaction),
      defaultDailyLimit: parseFloat(row.default_daily_limit),
      defaultMonthlyLimit: parseFloat(row.default_monthly_limit),
      isBlocked: row.is_blocked,
      blockedAt: row.blocked_at,
      blockedReason: row.blocked_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const userSettingsRepository = new UserSettingsRepository();
