import { pool } from '../config/database';
import {
  AP2Transaction,
  AP2TransactionType,
  AP2TransactionStatus,
} from '@agentic-commerce/shared-types';

export class AP2TransactionRepository {
  async create(
    merchantId: string,
    userId: string,
    agentId: string,
    mandateId: string,
    type: AP2TransactionType,
    amount: number | null,
    metadata: any
  ): Promise<AP2Transaction> {
    const query = `
      INSERT INTO ap2_transactions (
        merchant_id, user_id, agent_id, mandate_id, type, amount, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      merchantId,
      userId,
      agentId,
      mandateId,
      type,
      amount,
      JSON.stringify(metadata),
    ];

    const result = await pool.query(query, values);
    return this.mapRowToTransaction(result.rows[0]);
  }

  async getById(id: string): Promise<AP2Transaction | null> {
    const query = 'SELECT * FROM ap2_transactions WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTransaction(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: AP2TransactionStatus,
    gatewayTransactionId?: string,
    failureReason?: string
  ): Promise<AP2Transaction> {
    let query = `
      UPDATE ap2_transactions
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
    `;

    const values: any[] = [status];
    let paramCount = 1;

    if (status === AP2TransactionStatus.AUTHORIZED) {
      query += `, authorized_at = CURRENT_TIMESTAMP`;
    } else if (status === AP2TransactionStatus.COMPLETED) {
      query += `, completed_at = CURRENT_TIMESTAMP`;
    } else if (status === AP2TransactionStatus.FAILED || status === AP2TransactionStatus.DECLINED) {
      query += `, failed_at = CURRENT_TIMESTAMP`;
    }

    if (gatewayTransactionId) {
      paramCount++;
      query += `, gateway_transaction_id = $${paramCount}`;
      values.push(gatewayTransactionId);
    }

    if (failureReason) {
      paramCount++;
      query += `, failure_reason = $${paramCount}`;
      values.push(failureReason);
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return this.mapRowToTransaction(result.rows[0]);
  }

  async getByMerchant(
    merchantId: string,
    options?: {
      status?: AP2TransactionStatus;
      type?: AP2TransactionType;
      limit?: number;
      offset?: number;
    }
  ): Promise<AP2Transaction[]> {
    let query = 'SELECT * FROM ap2_transactions WHERE merchant_id = $1';
    const params: any[] = [merchantId];
    let paramCount = 1;

    if (options?.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(options.status);
    }

    if (options?.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(options.type);
    }

    query += ' ORDER BY requested_at DESC';

    if (options?.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRowToTransaction(row));
  }

  async getByUser(
    userId: string,
    options?: {
      status?: AP2TransactionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<AP2Transaction[]> {
    let query = 'SELECT * FROM ap2_transactions WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 1;

    if (options?.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(options.status);
    }

    query += ' ORDER BY requested_at DESC';

    if (options?.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRowToTransaction(row));
  }

  async getByMandate(mandateId: string, limit: number = 50): Promise<AP2Transaction[]> {
    const query = `
      SELECT * FROM ap2_transactions
      WHERE mandate_id = $1
      ORDER BY requested_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [mandateId, limit]);
    return result.rows.map(row => this.mapRowToTransaction(row));
  }

  async getDailyStats(merchantId: string, date: Date): Promise<{
    totalTransactions: number;
    totalVolume: number;
    completedCount: number;
    failedCount: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_volume,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM ap2_transactions
      WHERE merchant_id = $1
        AND DATE(requested_at) = DATE($2)
    `;

    const result = await pool.query(query, [merchantId, date]);
    const row = result.rows[0];

    return {
      totalTransactions: parseInt(row.total_transactions),
      totalVolume: parseFloat(row.total_volume || 0),
      completedCount: parseInt(row.completed_count || 0),
      failedCount: parseInt(row.failed_count || 0),
    };
  }

  async getMonthlyStats(merchantId: string, year: number, month: number): Promise<{
    totalTransactions: number;
    totalVolume: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_volume
      FROM ap2_transactions
      WHERE merchant_id = $1
        AND EXTRACT(YEAR FROM requested_at) = $2
        AND EXTRACT(MONTH FROM requested_at) = $3
    `;

    const result = await pool.query(query, [merchantId, year, month]);
    const row = result.rows[0];

    return {
      totalTransactions: parseInt(row.total_transactions),
      totalVolume: parseFloat(row.total_volume || 0),
    };
  }

  async getSpendingByMandate(mandateId: string, period: 'day' | 'month'): Promise<number> {
    const periodFilter = period === 'day'
      ? "DATE(requested_at) = CURRENT_DATE"
      : "EXTRACT(YEAR FROM requested_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM requested_at) = EXTRACT(MONTH FROM CURRENT_DATE)";

    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM ap2_transactions
      WHERE mandate_id = $1
        AND status = 'completed'
        AND ${periodFilter}
    `;

    const result = await pool.query(query, [mandateId]);
    return parseFloat(result.rows[0].total_spent || 0);
  }

  async countTransactionsByMandate(mandateId: string, period: 'day' | 'month'): Promise<number> {
    const periodFilter = period === 'day'
      ? "DATE(requested_at) = CURRENT_DATE"
      : "EXTRACT(YEAR FROM requested_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM requested_at) = EXTRACT(MONTH FROM CURRENT_DATE)";

    const query = `
      SELECT COUNT(*) as count
      FROM ap2_transactions
      WHERE mandate_id = $1
        AND ${periodFilter}
    `;

    const result = await pool.query(query, [mandateId]);
    return parseInt(result.rows[0].count);
  }

  private mapRowToTransaction(row: any): AP2Transaction {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      userId: row.user_id,
      agentId: row.agent_id,
      mandateId: row.mandate_id,
      type: row.type as AP2TransactionType,
      status: row.status as AP2TransactionStatus,
      amount: row.amount ? parseFloat(row.amount) : 0,
      currency: row.currency,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      requestedAt: row.requested_at,
      authorizedAt: row.authorized_at,
      completedAt: row.completed_at,
      failedAt: row.failed_at,
      failureReason: row.failure_reason,
      gatewayTransactionId: row.gateway_transaction_id,
    };
  }
}
