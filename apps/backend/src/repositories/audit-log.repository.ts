/**
 * Audit Log Repository
 * Database operations for admin audit logs
 */

import { query } from '../config/database';
import crypto from 'crypto';

/**
 * Audit Log entity
 */
export interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Audit Log with admin details
 */
export interface AuditLogWithAdmin extends AuditLog {
  adminEmail?: string;
  adminName?: string;
}

/**
 * Create Audit Log request
 */
export interface CreateAuditLogRequest {
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Query options for audit logs
 */
export interface AuditLogQueryOptions {
  adminUserId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogRepository {
  /**
   * Create a new audit log entry
   */
  async create(data: CreateAuditLogRequest): Promise<AuditLog> {
    const id = crypto.randomUUID();

    try {
      const result = await query(
        `INSERT INTO admin_audit_logs (
          id, admin_user_id, action, resource_type, resource_id,
          old_value, new_value, ip_address, user_agent
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          data.adminUserId,
          data.action,
          data.resourceType,
          data.resourceId || null,
          data.oldValue ? JSON.stringify(data.oldValue) : null,
          data.newValue ? JSON.stringify(data.newValue) : null,
          data.ipAddress || null,
          data.userAgent || null,
        ]
      );

      return this.mapRowToAuditLog(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn('[AuditLogRepository] Table does not exist');
        return this.createMockAuditLog(id, data);
      }
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAll(options: AuditLogQueryOptions = {}): Promise<{ logs: AuditLogWithAdmin[]; total: number }> {
    const {
      adminUserId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = options;

    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (adminUserId) {
        whereClause += ` AND aal.admin_user_id = $${paramIndex++}`;
        params.push(adminUserId);
      }
      if (action) {
        whereClause += ` AND aal.action = $${paramIndex++}`;
        params.push(action);
      }
      if (resourceType) {
        whereClause += ` AND aal.resource_type = $${paramIndex++}`;
        params.push(resourceType);
      }
      if (resourceId) {
        whereClause += ` AND aal.resource_id = $${paramIndex++}`;
        params.push(resourceId);
      }
      if (startDate) {
        whereClause += ` AND aal.created_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        whereClause += ` AND aal.created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) FROM admin_audit_logs aal ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Get logs with admin details
      const result = await query(
        `SELECT aal.*, u.email as admin_email, u.first_name, u.last_name
         FROM admin_audit_logs aal
         LEFT JOIN users u ON aal.admin_user_id = u.id
         ${whereClause}
         ORDER BY aal.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      return {
        logs: result.rows.map((row) => this.mapRowToAuditLogWithAdmin(row)),
        total,
      };
    } catch (error: any) {
      if (error.code === '42P01') {
        return { logs: [], total: 0 };
      }
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async getByResource(resourceType: string, resourceId: string): Promise<AuditLogWithAdmin[]> {
    try {
      const result = await query(
        `SELECT aal.*, u.email as admin_email, u.first_name, u.last_name
         FROM admin_audit_logs aal
         LEFT JOIN users u ON aal.admin_user_id = u.id
         WHERE aal.resource_type = $1 AND aal.resource_id = $2
         ORDER BY aal.created_at DESC`,
        [resourceType, resourceId]
      );

      return result.rows.map((row) => this.mapRowToAuditLogWithAdmin(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get audit logs by admin user
   */
  async getByAdminUser(
    adminUserId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const result = await query(
        `SELECT * FROM admin_audit_logs
         WHERE admin_user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [adminUserId, limit, offset]
      );

      return result.rows.map((row) => this.mapRowToAuditLog(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get recent audit logs
   */
  async getRecent(limit: number = 20): Promise<AuditLogWithAdmin[]> {
    try {
      const result = await query(
        `SELECT aal.*, u.email as admin_email, u.first_name, u.last_name
         FROM admin_audit_logs aal
         LEFT JOIN users u ON aal.admin_user_id = u.id
         ORDER BY aal.created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map((row) => this.mapRowToAuditLogWithAdmin(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete old audit logs (for data retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM admin_audit_logs
         WHERE created_at < NOW() - INTERVAL '${days} days'`
      );

      return result.rowCount ?? 0;
    } catch (error: any) {
      if (error.code === '42P01') {
        return 0;
      }
      throw error;
    }
  }

  private createMockAuditLog(id: string, data: CreateAuditLogRequest): AuditLog {
    return {
      id,
      adminUserId: data.adminUserId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date(),
    };
  }

  private mapRowToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      adminUserId: row.admin_user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValue: row.old_value ? (typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value) : undefined,
      newValue: row.new_value ? (typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }

  private mapRowToAuditLogWithAdmin(row: any): AuditLogWithAdmin {
    return {
      ...this.mapRowToAuditLog(row),
      adminEmail: row.admin_email,
      adminName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : undefined,
    };
  }
}

export const auditLogRepository = new AuditLogRepository();
