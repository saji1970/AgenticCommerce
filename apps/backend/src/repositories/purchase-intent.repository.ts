import { query } from '../config/database';
import { PurchaseIntent } from '@agentic-commerce/shared-types';

export class PurchaseIntentRepository {
  async create(
    userId: string,
    agentId: string,
    mandateId: string,
    items: any[],
    subtotal: number,
    tax: number,
    total: number,
    reasoning: string,
    expiresAt: Date
  ): Promise<PurchaseIntent> {
    const result = await query(
      `INSERT INTO purchase_intents (user_id, agent_id, mandate_id, items, subtotal, tax, total, reasoning, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, agentId, mandateId, JSON.stringify(items), subtotal, tax, total, reasoning, expiresAt]
    );

    return this.mapRowToIntent(result.rows[0]);
  }

  async getById(intentId: string): Promise<PurchaseIntent | null> {
    const result = await query(
      'SELECT * FROM purchase_intents WHERE id = $1',
      [intentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToIntent(result.rows[0]);
  }

  async getUserIntents(userId: string, status?: string): Promise<PurchaseIntent[]> {
    let queryText = 'SELECT * FROM purchase_intents WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      queryText += ` AND status = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows.map(row => this.mapRowToIntent(row));
  }

  async approve(intentId: string): Promise<PurchaseIntent> {
    const result = await query(
      `UPDATE purchase_intents
       SET status = 'approved',
           approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [intentId]
    );

    return this.mapRowToIntent(result.rows[0]);
  }

  async reject(intentId: string, reason: string): Promise<PurchaseIntent> {
    const result = await query(
      `UPDATE purchase_intents
       SET status = 'rejected',
           rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [intentId, reason]
    );

    return this.mapRowToIntent(result.rows[0]);
  }

  async execute(intentId: string): Promise<PurchaseIntent> {
    const result = await query(
      `UPDATE purchase_intents
       SET status = 'executed',
           executed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [intentId]
    );

    return this.mapRowToIntent(result.rows[0]);
  }

  async expireOldIntents(): Promise<void> {
    await query(
      `UPDATE purchase_intents
       SET status = 'expired'
       WHERE status = 'pending'
         AND expires_at < CURRENT_TIMESTAMP`
    );
  }

  private mapRowToIntent(row: any): PurchaseIntent {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      mandateId: row.mandate_id,
      items: row.items,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      reasoning: row.reasoning,
      status: row.status,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      executedAt: row.executed_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
