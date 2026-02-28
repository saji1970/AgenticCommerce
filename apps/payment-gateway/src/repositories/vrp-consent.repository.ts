import { query } from '../config/database';

export interface VrpConsent {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  paymentMethod: Record<string, any>;
  maxAmountPerPayment: number;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  expiryDate: string | null;
  amountUsedToday: number;
  amountUsedMonth: number;
  transactionsToday: number;
  lastDailyReset: string | null;
  lastMonthlyReset: string | null;
  consentToken: string | null;
  constraints: Record<string, any>;
  appMandateId: string | null;
  merchantId: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

function mapRowToConsent(row: any): VrpConsent {
  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    status: row.status,
    paymentMethod: row.payment_method,
    maxAmountPerPayment: parseFloat(row.max_amount_per_payment),
    dailyLimit: row.daily_limit ? parseFloat(row.daily_limit) : null,
    monthlyLimit: row.monthly_limit ? parseFloat(row.monthly_limit) : null,
    expiryDate: row.expiry_date?.toISOString() ?? null,
    amountUsedToday: parseFloat(row.amount_used_today || '0'),
    amountUsedMonth: parseFloat(row.amount_used_month || '0'),
    transactionsToday: parseInt(row.transactions_today || '0', 10),
    lastDailyReset: row.last_daily_reset ?? null,
    lastMonthlyReset: row.last_monthly_reset ?? null,
    consentToken: row.consent_token ?? null,
    constraints: row.constraints || {},
    appMandateId: row.app_mandate_id ?? null,
    merchantId: row.merchant_id ?? null,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
    revokedReason: row.revoked_reason ?? null,
  };
}

export const vrpConsentRepository = {
  async create(data: {
    userId: string;
    agentId: string;
    agentName: string;
    paymentMethod: Record<string, any>;
    maxAmountPerPayment: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    expiryDate?: string;
    constraints?: Record<string, any>;
    appMandateId?: string;
    merchantId?: string;
  }): Promise<VrpConsent> {
    const result = await query(
      `INSERT INTO vrp_consents (user_id, agent_id, agent_name, payment_method, max_amount_per_payment, daily_limit, monthly_limit, expiry_date, constraints, app_mandate_id, merchant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.userId,
        data.agentId,
        data.agentName,
        JSON.stringify(data.paymentMethod),
        data.maxAmountPerPayment,
        data.dailyLimit ?? null,
        data.monthlyLimit ?? null,
        data.expiryDate ?? null,
        JSON.stringify(data.constraints || {}),
        data.appMandateId ?? null,
        data.merchantId ?? null,
      ]
    );
    return mapRowToConsent(result.rows[0]);
  },

  async getById(id: string): Promise<VrpConsent | null> {
    const result = await query('SELECT * FROM vrp_consents WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRowToConsent(result.rows[0]) : null;
  },

  async getByUserId(userId: string, status?: string): Promise<VrpConsent[]> {
    let sql = 'SELECT * FROM vrp_consents WHERE user_id = $1';
    const params: any[] = [userId];
    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    return result.rows.map(mapRowToConsent);
  },

  async getAll(filters?: { status?: string; agentId?: string; merchantId?: string; userId?: string; limit?: number; offset?: number }): Promise<{ consents: VrpConsent[]; total: number }> {
    let countSql = 'SELECT COUNT(*) FROM vrp_consents WHERE 1=1';
    let sql = 'SELECT * FROM vrp_consents WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.status) {
      const clause = ` AND status = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.status);
    }
    if (filters?.agentId) {
      const clause = ` AND agent_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.agentId);
    }
    if (filters?.merchantId) {
      const clause = ` AND merchant_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.merchantId);
    }
    if (filters?.userId) {
      const clause = ` AND user_id = $${paramIdx++}`;
      countSql += clause;
      sql += clause;
      params.push(filters.userId);
    }

    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);

    sql += ' ORDER BY created_at DESC';
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return { consents: result.rows.map(mapRowToConsent), total };
  },

  async updateStatus(id: string, status: string, extra?: { revokedReason?: string }): Promise<VrpConsent | null> {
    let sql = `UPDATE vrp_consents SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params: any[] = [status];
    let paramIdx = 2;

    if (status === 'revoked') {
      sql += `, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $${paramIdx++}`;
      params.push(extra?.revokedReason || null);
    }

    sql += ` WHERE id = $${paramIdx++} RETURNING *`;
    params.push(id);

    const result = await query(sql, params);
    return result.rows.length > 0 ? mapRowToConsent(result.rows[0]) : null;
  },

  async updateUsage(id: string, amount: number): Promise<VrpConsent | null> {
    const result = await query(
      `UPDATE vrp_consents
       SET amount_used_today = amount_used_today + $1,
           amount_used_month = amount_used_month + $1,
           transactions_today = transactions_today + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [amount, id]
    );
    return result.rows.length > 0 ? mapRowToConsent(result.rows[0]) : null;
  },

  async resetDailyCounters(id: string): Promise<void> {
    await query(
      `UPDATE vrp_consents
       SET amount_used_today = 0, transactions_today = 0, last_daily_reset = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  },

  async resetMonthlyCounters(id: string): Promise<void> {
    await query(
      `UPDATE vrp_consents
       SET amount_used_month = 0, last_monthly_reset = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  },

  async storeToken(id: string, token: string): Promise<void> {
    await query(
      `UPDATE vrp_consents SET consent_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [token, id]
    );
  },
};
