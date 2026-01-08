import { query } from '../config/database';
import { Mandate, MandateType, MandateStatus, CreateMandateRequest } from '@agentic-commerce/shared-types';

export class MandateRepository {
  async create(
    userId: string,
    request: CreateMandateRequest
  ): Promise<Mandate> {
    const result = await query(
      `INSERT INTO agent_mandates (user_id, agent_id, agent_name, type, status, constraints, valid_until)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING *`,
      [
        userId,
        request.agentId,
        request.agentName,
        request.type,
        JSON.stringify(request.constraints),
        request.validUntil || null,
      ]
    );

    return this.mapRowToMandate(result.rows[0]);
  }

  async getById(mandateId: string): Promise<Mandate | null> {
    const result = await query(
      'SELECT * FROM agent_mandates WHERE id = $1',
      [mandateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMandate(result.rows[0]);
  }

  async getUserMandates(
    userId: string,
    status?: MandateStatus,
    type?: MandateType
  ): Promise<Mandate[]> {
    let queryText = 'SELECT * FROM agent_mandates WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      queryText += ` AND status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      queryText += ` AND type = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows.map(row => this.mapRowToMandate(row));
  }

  async updateStatus(
    mandateId: string,
    status: MandateStatus,
    revokedReason?: string
  ): Promise<Mandate> {
    const result = await query(
      `UPDATE agent_mandates
       SET status = $2,
           revoked_at = $3,
           revoked_reason = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        mandateId,
        status,
        status === MandateStatus.REVOKED ? new Date() : null,
        revokedReason || null,
      ]
    );

    return this.mapRowToMandate(result.rows[0]);
  }

  async updateConstraints(
    mandateId: string,
    constraints: any
  ): Promise<Mandate> {
    const result = await query(
      `UPDATE agent_mandates
       SET constraints = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [mandateId, JSON.stringify(constraints)]
    );

    return this.mapRowToMandate(result.rows[0]);
  }

  async checkExpiredMandates(): Promise<void> {
    await query(
      `UPDATE agent_mandates
       SET status = 'expired'
       WHERE status = 'active'
         AND valid_until IS NOT NULL
         AND valid_until < CURRENT_TIMESTAMP`
    );
  }

  private mapRowToMandate(row: any): Mandate {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      type: row.type as MandateType,
      status: row.status as MandateStatus,
      constraints: row.constraints,
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revokedAt: row.revoked_at,
      revokedReason: row.revoked_reason,
    };
  }
}
