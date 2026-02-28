import { query } from '../config/database';

export interface VrpTransaction {
  id: string;
  consentId: string;
  userId: string;
  agentId: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string | null;
  description: string | null;
  metadata: Record<string, any>;
  mandateId: string | null;
  appMandateId: string | null;
  cartId: string | null;
  intentId: string | null;
  merchantId: string | null;
  productInfo: Record<string, any>;
  createdAt: string;
  processedAt: string | null;
}

function mapRowToTransaction(row: any): VrpTransaction {
  return {
    id: row.id,
    consentId: row.consent_id,
    userId: row.user_id,
    agentId: row.agent_id,
    amount: parseFloat(row.amount),
    currency: row.currency,
    status: row.status,
    transactionId: row.transaction_id ?? null,
    description: row.description ?? null,
    metadata: row.metadata || {},
    mandateId: row.mandate_id ?? null,
    appMandateId: row.app_mandate_id ?? null,
    cartId: row.cart_id ?? null,
    intentId: row.intent_id ?? null,
    merchantId: row.merchant_id ?? null,
    productInfo: row.product_info || {},
    createdAt: row.created_at?.toISOString(),
    processedAt: row.processed_at?.toISOString() ?? null,
  };
}

export const vrpTransactionRepository = {
  async create(data: {
    consentId: string;
    userId: string;
    agentId: string;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
    mandateId?: string;
    appMandateId?: string;
    cartId?: string;
    intentId?: string;
    merchantId?: string;
    productInfo?: Record<string, any>;
  }): Promise<VrpTransaction> {
    const result = await query(
      `INSERT INTO vrp_transactions (consent_id, user_id, agent_id, amount, currency, description, metadata, mandate_id, app_mandate_id, cart_id, intent_id, merchant_id, product_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.consentId,
        data.userId,
        data.agentId,
        data.amount,
        data.currency || 'USD',
        data.description || null,
        JSON.stringify(data.metadata || {}),
        data.mandateId || null,
        data.appMandateId || null,
        data.cartId || null,
        data.intentId || null,
        data.merchantId || null,
        JSON.stringify(data.productInfo || {}),
      ]
    );
    return mapRowToTransaction(result.rows[0]);
  },

  async updateStatus(id: string, status: string, transactionId?: string): Promise<VrpTransaction | null> {
    const result = await query(
      `UPDATE vrp_transactions
       SET status = $1, transaction_id = COALESCE($2, transaction_id), processed_at = CASE WHEN $1 IN ('completed','failed') THEN CURRENT_TIMESTAMP ELSE processed_at END
       WHERE id = $3 RETURNING *`,
      [status, transactionId || null, id]
    );
    return result.rows.length > 0 ? mapRowToTransaction(result.rows[0]) : null;
  },

  async getByConsentId(consentId: string, limit = 50, offset = 0): Promise<{ transactions: VrpTransaction[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) FROM vrp_transactions WHERE consent_id = $1',
      [consentId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      'SELECT * FROM vrp_transactions WHERE consent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [consentId, limit, offset]
    );
    return { transactions: result.rows.map(mapRowToTransaction), total };
  },

  async getAll(filters?: { status?: string; userId?: string; agentId?: string; mandateId?: string; merchantId?: string; limit?: number; offset?: number }): Promise<{ transactions: VrpTransaction[]; total: number }> {
    let countSql = 'SELECT COUNT(*) FROM vrp_transactions WHERE 1=1';
    let sql = 'SELECT * FROM vrp_transactions WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.status) {
      const clause = ` AND status = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.status);
    }
    if (filters?.userId) {
      const clause = ` AND user_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.userId);
    }
    if (filters?.agentId) {
      const clause = ` AND agent_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.agentId);
    }
    if (filters?.mandateId) {
      const clause = ` AND mandate_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.mandateId);
    }
    if (filters?.merchantId) {
      const clause = ` AND merchant_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.merchantId);
    }

    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);

    sql += ' ORDER BY created_at DESC';
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return { transactions: result.rows.map(mapRowToTransaction), total };
  },
};
