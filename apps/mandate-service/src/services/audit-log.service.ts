/**
 * Security Audit Log Service
 * Append-only audit log with hash-chain tamper evidence.
 * Every state change, signature, authorization, payment result, and violation is recorded.
 */

import crypto from 'crypto';
import { query } from '../config/database';
import { CreateAuditEntryInput } from '../schemas/audit.schema';

export interface AuditEntry {
  id: string;
  actorType: string;
  actorId: string;
  actorIdentity?: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  mandateId?: string;
  artifactId?: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  oldState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  entryHash?: string;
  previousHash?: string;
  createdAt: Date;
}

// In-memory reference to last hash for chain continuity within this process.
// On startup, load from the most recent DB row.
let lastEntryHash: string | null = null;
let hashChainInitialized = false;

async function initHashChain(): Promise<void> {
  if (hashChainInitialized) return;
  try {
    const result = await query(
      `SELECT entry_hash FROM security_audit_log ORDER BY created_at DESC LIMIT 1`,
    );
    lastEntryHash = result.rows.length > 0 ? result.rows[0].entry_hash : null;
  } catch {
    lastEntryHash = null;
  }
  hashChainInitialized = true;
}

function computeEntryHash(previousHash: string | null, entryContent: string): string {
  const input = (previousHash || 'GENESIS') + '|' + entryContent;
  return crypto.createHash('sha256').update(input).digest('hex');
}

export class AuditLogService {
  /**
   * Append a new audit entry. Never throws — audit logging must not break business flows.
   */
  async log(entry: CreateAuditEntryInput): Promise<AuditEntry | null> {
    try {
      await initHashChain();

      const id = crypto.randomUUID();
      const previousHash = lastEntryHash;
      const entryContent = JSON.stringify({
        id,
        ...entry,
        timestamp: new Date().toISOString(),
      });
      const entryHash = computeEntryHash(previousHash, entryContent);

      const result = await query(
        `INSERT INTO security_audit_log (
          id, actor_type, actor_id, actor_identity,
          event_type, event_category, severity,
          mandate_id, artifact_id, resource_type, resource_id,
          description, old_state, new_state, metadata,
          ip_address, user_agent, request_id,
          entry_hash, previous_hash
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *`,
        [
          id,
          entry.actorType,
          entry.actorId,
          entry.actorIdentity || null,
          entry.eventType,
          entry.eventCategory,
          entry.severity || 'info',
          entry.mandateId || null,
          entry.artifactId || null,
          entry.resourceType || null,
          entry.resourceId || null,
          entry.description,
          entry.oldState ? JSON.stringify(entry.oldState) : null,
          entry.newState ? JSON.stringify(entry.newState) : null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.requestId || null,
          entryHash,
          previousHash,
        ],
      );

      lastEntryHash = entryHash;
      return this.mapRow(result.rows[0]);
    } catch (err) {
      console.error('[AuditLog] Failed to write audit entry:', err);
      return null;
    }
  }

  // ---- Convenience methods for common events ----

  async logMandateStateChange(
    actorType: 'user' | 'agent' | 'merchant' | 'system',
    actorId: string,
    mandateId: string,
    oldStatus: string,
    newStatus: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorType,
      actorId,
      eventType: 'mandate.state_change',
      eventCategory: 'mandate',
      severity: 'info',
      mandateId,
      description,
      oldState: { status: oldStatus },
      newState: { status: newStatus },
      metadata,
    });
  }

  async logSignatureEvent(
    userId: string,
    mandateId: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorType: 'user',
      actorId: userId,
      eventType: 'mandate.signature',
      eventCategory: 'mandate',
      severity: 'info',
      mandateId,
      description,
      metadata,
    });
  }

  async logPaymentAuthorization(
    agentId: string,
    mandateId: string,
    artifactId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    await this.log({
      actorType: 'agent',
      actorId: agentId,
      eventType: 'payment.authorized',
      eventCategory: 'payment',
      severity: 'info',
      mandateId,
      artifactId,
      description,
      metadata: { amount },
    });
  }

  async logPaymentResult(
    artifactId: string,
    mandateId: string,
    status: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorType: 'system',
      actorId: 'payment-gateway',
      eventType: `payment.${status}`,
      eventCategory: 'payment',
      severity: status === 'failed' ? 'warning' : 'info',
      mandateId,
      artifactId,
      description,
      metadata,
    });
  }

  async logSecurityViolation(
    actorType: 'user' | 'agent' | 'merchant' | 'system',
    actorId: string,
    eventType: string,
    description: string,
    mandateId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorType,
      actorId,
      eventType,
      eventCategory: 'security',
      severity: 'critical',
      mandateId,
      description,
      metadata,
    });
  }

  // ---- Query methods ----

  async getByMandateId(mandateId: string, limit = 100): Promise<AuditEntry[]> {
    const result = await query(
      `SELECT * FROM security_audit_log WHERE mandate_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [mandateId, limit],
    );
    return result.rows.map(this.mapRow);
  }

  async getByActor(actorType: string, actorId: string, limit = 100): Promise<AuditEntry[]> {
    const result = await query(
      `SELECT * FROM security_audit_log WHERE actor_type = $1 AND actor_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [actorType, actorId, limit],
    );
    return result.rows.map(this.mapRow);
  }

  async getSecurityEvents(limit = 100): Promise<AuditEntry[]> {
    const result = await query(
      `SELECT * FROM security_audit_log WHERE severity = 'critical' ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return result.rows.map(this.mapRow);
  }

  async queryLog(filters: {
    eventCategory?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditEntry[]; total: number }> {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (filters.eventCategory) {
      where += ` AND event_category = $${idx++}`;
      params.push(filters.eventCategory);
    }
    if (filters.severity) {
      where += ` AND severity = $${idx++}`;
      params.push(filters.severity);
    }
    if (filters.startDate) {
      where += ` AND created_at >= $${idx++}`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      where += ` AND created_at <= $${idx++}`;
      params.push(filters.endDate);
    }

    const countResult = await query(`SELECT COUNT(*) FROM security_audit_log ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const result = await query(
      `SELECT * FROM security_audit_log ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    return { entries: result.rows.map(this.mapRow), total };
  }

  /**
   * Verify hash chain integrity for a range of entries.
   */
  async verifyChainIntegrity(limit = 1000): Promise<{ valid: boolean; brokenAt?: string }> {
    const result = await query(
      `SELECT id, entry_hash, previous_hash FROM security_audit_log ORDER BY created_at ASC LIMIT $1`,
      [limit],
    );

    let expectedPrevious: string | null = null;
    for (const row of result.rows) {
      if (expectedPrevious !== null && row.previous_hash !== expectedPrevious) {
        return { valid: false, brokenAt: row.id };
      }
      expectedPrevious = row.entry_hash;
    }

    return { valid: true };
  }

  private mapRow(row: any): AuditEntry {
    return {
      id: row.id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorIdentity: row.actor_identity,
      eventType: row.event_type,
      eventCategory: row.event_category,
      severity: row.severity,
      mandateId: row.mandate_id,
      artifactId: row.artifact_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      description: row.description,
      oldState: row.old_state,
      newState: row.new_state,
      metadata: row.metadata,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestId: row.request_id,
      entryHash: row.entry_hash,
      previousHash: row.previous_hash,
      createdAt: row.created_at,
    };
  }
}

export const auditLogService = new AuditLogService();
