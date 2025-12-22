import { Pool } from 'pg';
import { MandateAuditEvent } from '@agentic-commerce/shared';
import { AuditLogStore } from './MandateAuditLogger';

/**
 * PostgreSQL implementation of AuditLogStore
 */
export class PostgresAuditStore implements AuditLogStore {
  constructor(private pool: Pool) {}

  async save(event: MandateAuditEvent): Promise<void> {
    const query = `
      INSERT INTO mandate_audit_events (
        event_id,
        mandate_id,
        mandate_type,
        event_type,
        user_id,
        ip_address,
        user_agent,
        metadata,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      event.event_id,
      event.mandate_id,
      event.mandate_type,
      event.event_type,
      event.user_id,
      event.ip_address || null,
      event.user_agent || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.timestamp,
    ];

    await this.pool.query(query, values);
  }

  async query(filters: Partial<MandateAuditEvent>): Promise<MandateAuditEvent[]> {
    let query = 'SELECT * FROM mandate_audit_events WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters.mandate_id) {
      query += ` AND mandate_id = $${paramCount}`;
      values.push(filters.mandate_id);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(filters.user_id);
      paramCount++;
    }

    if (filters.mandate_type) {
      query += ` AND mandate_type = $${paramCount}`;
      values.push(filters.mandate_type);
      paramCount++;
    }

    if (filters.event_type) {
      query += ` AND event_type = $${paramCount}`;
      values.push(filters.event_type);
      paramCount++;
    }

    query += ' ORDER BY timestamp DESC';

    const result = await this.pool.query(query, values);

    return result.rows.map((row) => ({
      event_id: row.event_id,
      mandate_id: row.mandate_id,
      mandate_type: row.mandate_type,
      event_type: row.event_type,
      user_id: row.user_id,
      timestamp: row.timestamp,
      metadata: row.metadata,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
    }));
  }
}
