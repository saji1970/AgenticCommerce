import { query } from '../config/database';

export interface Dispute {
  id: string;
  transactionId: string;
  mandateId: string | null;
  userId: string;
  agentId: string | null;
  merchantId: string | null;
  status: 'open' | 'investigating' | 'evidence_submitted' | 'won' | 'lost' | 'closed';
  reason: string;
  disputeAmount: number;
  currency: string;
  externalCaseId: string | null;
  evidencePack: Record<string, any>;
  bauPushStatus: 'pending' | 'pushed' | 'failed' | 'not_required';
  bauPushResponse: Record<string, any> | null;
  bauPushedAt: Date | null;
  notes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDisputeData {
  transactionId: string;
  mandateId?: string;
  userId: string;
  agentId?: string;
  merchantId?: string;
  reason: string;
  disputeAmount: number;
  currency?: string;
  notes?: string;
}

export interface UpdateDisputeData {
  status?: string;
  evidencePack?: Record<string, any>;
  bauPushStatus?: string;
  bauPushResponse?: Record<string, any>;
  bauPushedAt?: Date;
  notes?: string;
  resolvedAt?: Date;
  externalCaseId?: string;
}

export interface DisputeFilters {
  status?: string;
  merchantId?: string;
  agentId?: string;
  transactionId?: string;
}

export class DisputeRepository {
  async create(data: CreateDisputeData): Promise<Dispute> {
    const result = await query(
      `INSERT INTO disputes (transaction_id, mandate_id, user_id, agent_id, merchant_id, reason, dispute_amount, currency, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.transactionId,
        data.mandateId || null,
        data.userId,
        data.agentId || null,
        data.merchantId || null,
        data.reason,
        data.disputeAmount,
        data.currency || 'USD',
        data.notes || null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async getById(id: string): Promise<Dispute | null> {
    const result = await query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getByTransactionId(transactionId: string): Promise<Dispute | null> {
    const result = await query(
      'SELECT * FROM disputes WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1',
      [transactionId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getAll(filters: DisputeFilters, limit: number = 20, offset: number = 0): Promise<{ disputes: Dispute[]; total: number }> {
    let queryText = 'SELECT * FROM disputes WHERE 1=1';
    let countText = 'SELECT COUNT(*)::int AS total FROM disputes WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      countParams.push(filters.status);
      queryText += ` AND status = $${params.length}`;
      countText += ` AND status = $${countParams.length}`;
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
    if (filters.transactionId) {
      params.push(filters.transactionId);
      countParams.push(filters.transactionId);
      queryText += ` AND transaction_id = $${params.length}`;
      countText += ` AND transaction_id = $${countParams.length}`;
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
      disputes: dataResult.rows.map(row => this.mapRow(row)),
      total: countResult.rows[0].total,
    };
  }

  async update(id: string, data: UpdateDisputeData): Promise<Dispute> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [id];
    let idx = 2;

    if (data.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.evidencePack !== undefined) {
      setClauses.push(`evidence_pack = $${idx++}`);
      params.push(JSON.stringify(data.evidencePack));
    }
    if (data.bauPushStatus !== undefined) {
      setClauses.push(`bau_push_status = $${idx++}`);
      params.push(data.bauPushStatus);
    }
    if (data.bauPushResponse !== undefined) {
      setClauses.push(`bau_push_response = $${idx++}`);
      params.push(JSON.stringify(data.bauPushResponse));
    }
    if (data.bauPushedAt !== undefined) {
      setClauses.push(`bau_pushed_at = $${idx++}`);
      params.push(data.bauPushedAt);
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      params.push(data.notes);
    }
    if (data.resolvedAt !== undefined) {
      setClauses.push(`resolved_at = $${idx++}`);
      params.push(data.resolvedAt);
    }
    if (data.externalCaseId !== undefined) {
      setClauses.push(`external_case_id = $${idx++}`);
      params.push(data.externalCaseId);
    }

    const result = await query(
      `UPDATE disputes SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): Dispute {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      mandateId: row.mandate_id,
      userId: row.user_id,
      agentId: row.agent_id,
      merchantId: row.merchant_id,
      status: row.status,
      reason: row.reason,
      disputeAmount: parseFloat(row.dispute_amount),
      currency: row.currency,
      externalCaseId: row.external_case_id,
      evidencePack: typeof row.evidence_pack === 'string'
        ? JSON.parse(row.evidence_pack)
        : row.evidence_pack || {},
      bauPushStatus: row.bau_push_status,
      bauPushResponse: row.bau_push_response
        ? (typeof row.bau_push_response === 'string'
            ? JSON.parse(row.bau_push_response)
            : row.bau_push_response)
        : null,
      bauPushedAt: row.bau_pushed_at,
      notes: row.notes,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
