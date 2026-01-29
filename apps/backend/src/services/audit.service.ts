/**
 * Audit Service
 * Handles audit logging for administrative actions
 */

import { auditLogRepository, CreateAuditLogRequest, AuditLogQueryOptions } from '../repositories/audit-log.repository';
import { Request } from 'express';

export class AuditService {
  /**
   * Log an administrative action
   */
  async logAction(
    req: Request,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>
  ): Promise<void> {
    const adminUserId = (req as any).user?.id;
    if (!adminUserId) {
      console.warn('[AuditService] No admin user ID found in request');
      return;
    }

    const data: CreateAuditLogRequest = {
      adminUserId,
      action,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent'),
    };

    try {
      await auditLogRepository.create(data);
    } catch (error) {
      console.error('[AuditService] Failed to create audit log:', error);
      // Don't throw - audit logging failures shouldn't break the main operation
    }
  }

  /**
   * Log a create action
   */
  async logCreate(
    req: Request,
    resourceType: string,
    resourceId: string,
    newValue: Record<string, unknown>
  ): Promise<void> {
    await this.logAction(req, 'create', resourceType, resourceId, undefined, newValue);
  }

  /**
   * Log an update action
   */
  async logUpdate(
    req: Request,
    resourceType: string,
    resourceId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>
  ): Promise<void> {
    await this.logAction(req, 'update', resourceType, resourceId, oldValue, newValue);
  }

  /**
   * Log a delete action
   */
  async logDelete(
    req: Request,
    resourceType: string,
    resourceId: string,
    oldValue: Record<string, unknown>
  ): Promise<void> {
    await this.logAction(req, 'delete', resourceType, resourceId, oldValue, undefined);
  }

  /**
   * Log a status change
   */
  async logStatusChange(
    req: Request,
    resourceType: string,
    resourceId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.logAction(
      req,
      'status_change',
      resourceType,
      resourceId,
      { status: oldStatus },
      { status: newStatus }
    );
  }

  /**
   * Log a block action
   */
  async logBlock(
    req: Request,
    resourceType: string,
    resourceId: string,
    reason: string
  ): Promise<void> {
    await this.logAction(req, 'block', resourceType, resourceId, undefined, { reason });
  }

  /**
   * Log an unblock action
   */
  async logUnblock(
    req: Request,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    await this.logAction(req, 'unblock', resourceType, resourceId, undefined, undefined);
  }

  /**
   * Log a revoke action
   */
  async logRevoke(
    req: Request,
    resourceType: string,
    resourceId: string,
    reason: string
  ): Promise<void> {
    await this.logAction(req, 'revoke', resourceType, resourceId, undefined, { reason });
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(options: AuditLogQueryOptions) {
    return auditLogRepository.getAll(options);
  }

  /**
   * Get audit logs for a specific resource
   */
  async getLogsForResource(resourceType: string, resourceId: string) {
    return auditLogRepository.getByResource(resourceType, resourceId);
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 20) {
    return auditLogRepository.getRecent(limit);
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(req: Request): string | undefined {
    const forwardedFor = req.get('X-Forwarded-For');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    return req.ip;
  }
}

export const auditService = new AuditService();
