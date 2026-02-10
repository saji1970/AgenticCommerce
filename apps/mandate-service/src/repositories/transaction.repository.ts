import { query } from '../config/database';

export interface Transaction {
  id: string;
  mandateId: string | null;
  userId: string;
  agentId: string | null;
  merchantId: string | null;
  type: 'payment' | 'refund' | 'authorization';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  gatewayTransactionId: string | null;
  gatewayResponse: Record<string, any>;
  metadata: Record<string, any>;
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionData {
  mandateId?: string;
  userId: string;
  agentId?: string;
  merchantId?: string;
  type: 'payment' | 'refund' | 'authorization';
  status?: string;
  amount: number;
  currency?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, any>;
  metadata?: Record<string, any>;
  errorMessage?: string;
  processedAt?: Date;
}

export interface TransactionFilters {
  status?: string;
  type?: string;
  merchantId?: string;
  agentId?: string;
  userId?: string;
  mandateId?: string;
}

export class TransactionRepository {
  async create(data: CreateTransactionData): Promise<Transaction> {
    const result = await query(
      `INSERT INTO transactions (mandate_id, user_id, agent_id, merchant_id, type, status, amount, currency, gateway_transaction_id, gateway_response, metadata, error_message, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.mandateId || null,
        data.userId,
        data.agentId || null,
        data.merchantId || null,
        data.type,
        data.status || 'pending',
        data.amount,
        data.currency || 'USD',
        data.gatewayTransactionId || null,
        JSON.stringify(data.gatewayResponse || {}),
        JSON.stringify(data.metadata || {}),
        data.errorMessage || null,
        data.processedAt || null,
      ]
    );

    return this.mapRowToTransaction(result.rows[0]);
  }

  async getById(id: string): Promise<Transaction | null> {
    const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToTransaction(result.rows[0]);
  }

  async getAll(filters: TransactionFilters, limit: number = 10, offset: number = 0): Promise<{ transactions: Transaction[]; total: number }> {
    let queryText = 'SELECT * FROM transactions WHERE 1=1';
    let countText = 'SELECT COUNT(*)::int AS total FROM transactions WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      countParams.push(filters.status);
      queryText += ` AND status = $${params.length}`;
      countText += ` AND status = $${countParams.length}`;
    }
    if (filters.type) {
      params.push(filters.type);
      countParams.push(filters.type);
      queryText += ` AND type = $${params.length}`;
      countText += ` AND type = $${countParams.length}`;
    }
    if (filters.merchantId) {
      params.push(filters.merchantId);
      countParams.push(filters.merchantId);
      queryText += ` AND merchant_id = $${params.length}`;
      countText += ` AND merchant_id = $${countParams.length}`;
    }
    if (filters.agentId) {
      params.push(filters.agentId);
      countParams.push(filters.agentId);
      queryText += ` AND agent_id = $${params.length}`;
      countText += ` AND agent_id = $${countParams.length}`;
    }
    if (filters.userId) {
      params.push(filters.userId);
      countParams.push(filters.userId);
      queryText += ` AND user_id = $${params.length}`;
      countText += ` AND user_id = $${countParams.length}`;
    }
    if (filters.mandateId) {
      params.push(filters.mandateId);
      countParams.push(filters.mandateId);
      queryText += ` AND mandate_id = $${params.length}`;
      countText += ` AND mandate_id = $${countParams.length}`;
    }

    queryText += ' ORDER BY created_at DESC';
    params.push(limit);
    queryText += ` LIMIT $${params.length}`;
    params.push(offset);
    queryText += ` OFFSET $${params.length}`;

    const [dataResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countText, countParams),
    ]);

    return {
      transactions: dataResult.rows.map(row => this.mapRowToTransaction(row)),
      total: countResult.rows[0].total,
    };
  }

  async getByMandateId(mandateId: string): Promise<Transaction[]> {
    const result = await query(
      'SELECT * FROM transactions WHERE mandate_id = $1 ORDER BY created_at DESC',
      [mandateId]
    );
    return result.rows.map(row => this.mapRowToTransaction(row));
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<Transaction> {
    const processedAt = (status === 'completed' || status === 'failed') ? new Date() : null;
    const result = await query(
      `UPDATE transactions SET status = $2, error_message = $3, processed_at = COALESCE($4, processed_at), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, status, errorMessage || null, processedAt]
    );
    return this.mapRowToTransaction(result.rows[0]);
  }

  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      mandateId: row.mandate_id,
      userId: row.user_id,
      agentId: row.agent_id,
      merchantId: row.merchant_id,
      type: row.type,
      status: row.status,
      amount: parseFloat(row.amount),
      currency: row.currency,
      gatewayTransactionId: row.gateway_transaction_id,
      gatewayResponse: typeof row.gateway_response === 'string'
        ? JSON.parse(row.gateway_response)
        : row.gateway_response || {},
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata || {},
      errorMessage: row.error_message,
      processedAt: row.processed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
