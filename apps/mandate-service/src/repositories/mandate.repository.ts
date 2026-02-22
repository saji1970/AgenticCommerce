import { query } from '../config/database';

export interface AgentMandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment' | 'app';
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  constraints: Record<string, any>;
  parentMandateId?: string;
  paymentMethods?: any[];
  validFrom: Date;
  validUntil?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMandateRequest {
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment' | 'app';
  constraints?: Record<string, any>;
  parentMandateId?: string;
  paymentMethods?: any[];
  validUntil?: Date;
}

export interface UpdateMandateRequest {
  status?: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  constraints?: Record<string, any>;
  validUntil?: Date;
  revokedReason?: string;
}

export class MandateRepository {
  async create(data: CreateMandateRequest): Promise<AgentMandate> {
    const result = await query(
      `INSERT INTO agent_mandates (user_id, agent_id, agent_name, type, status, constraints, parent_mandate_id, payment_methods, valid_until)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
       RETURNING *`,
      [
        data.userId,
        data.agentId,
        data.agentName,
        data.type,
        JSON.stringify(data.constraints || {}),
        data.parentMandateId || null,
        JSON.stringify(data.paymentMethods || []),
        data.validUntil || null,
      ]
    );

    return this.mapRowToMandate(result.rows[0]);
  }

  async getById(mandateId: string): Promise<AgentMandate | null> {
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
    status?: string,
    type?: string
  ): Promise<AgentMandate[]> {
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

  async getAllMandates(
    status?: string,
    type?: string,
    limit: number = 100,
    agentId?: string,
    offset: number = 0,
  ): Promise<{ mandates: AgentMandate[]; total: number }> {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (status) {
      params.push(status);
      countParams.push(status);
      where += ` AND status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      countParams.push(type);
      where += ` AND type = $${params.length}`;
    }

    if (agentId) {
      params.push(agentId);
      countParams.push(agentId);
      where += ` AND agent_id = $${params.length}`;
    }

    const countText = `SELECT COUNT(*)::int AS total FROM agent_mandates ${where}`;

    params.push(limit);
    let queryText = `SELECT * FROM agent_mandates ${where} ORDER BY created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    queryText += ` OFFSET $${params.length}`;

    const [dataResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countText, countParams),
    ]);

    return {
      mandates: dataResult.rows.map(row => this.mapRowToMandate(row)),
      total: countResult.rows[0].total,
    };
  }

  async getByUserAndAgent(
    userId: string,
    agentId: string,
    type?: string
  ): Promise<AgentMandate | null> {
    let queryText = 'SELECT * FROM agent_mandates WHERE user_id = $1 AND agent_id = $2';
    const params: any[] = [userId, agentId];

    if (type) {
      params.push(type);
      queryText += ` AND type = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC LIMIT 1';

    const result = await query(queryText, params);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMandate(result.rows[0]);
  }

  async updateStatus(
    mandateId: string,
    status: string,
    revokedReason?: string
  ): Promise<AgentMandate> {
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
        status === 'revoked' ? new Date() : null,
        revokedReason || null,
      ]
    );

    return this.mapRowToMandate(result.rows[0]);
  }

  async update(mandateId: string, data: UpdateMandateRequest): Promise<AgentMandate> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
      if (data.status === 'revoked') {
        updates.push(`revoked_at = CURRENT_TIMESTAMP`);
      }
    }
    if (data.constraints !== undefined) {
      updates.push(`constraints = $${paramIndex++}`);
      values.push(JSON.stringify(data.constraints));
    }
    if (data.validUntil !== undefined) {
      updates.push(`valid_until = $${paramIndex++}`);
      values.push(data.validUntil);
    }
    if (data.revokedReason !== undefined) {
      updates.push(`revoked_reason = $${paramIndex++}`);
      values.push(data.revokedReason);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(mandateId);

    const result = await query(
      `UPDATE agent_mandates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToMandate(result.rows[0]);
  }

  async getAllWithMerchantScope(
    merchantId: string,
    status?: string,
    type?: string,
    limit: number = 100,
    agentId?: string,
    offset: number = 0,
  ): Promise<{ mandates: AgentMandate[]; total: number }> {
    let where = `
      FROM agent_mandates am
      INNER JOIN ai_agent_apps aaa ON am.agent_id = aaa.agent_id
      WHERE aaa.merchant_id = $1`;
    const params: any[] = [merchantId];
    const countParams: any[] = [merchantId];

    if (status) {
      params.push(status);
      countParams.push(status);
      where += ` AND am.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      countParams.push(type);
      where += ` AND am.type = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      countParams.push(agentId);
      where += ` AND am.agent_id = $${params.length}`;
    }

    const countText = `SELECT COUNT(*)::int AS total ${where}`;

    params.push(limit);
    let queryText = `SELECT am.* ${where} ORDER BY am.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    queryText += ` OFFSET $${params.length}`;

    const [dataResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countText, countParams),
    ]);

    return {
      mandates: dataResult.rows.map(row => this.mapRowToMandate(row)),
      total: countResult.rows[0].total,
    };
  }

  async getByIdWithMerchantCheck(mandateId: string): Promise<(AgentMandate & { agentMerchantId?: string }) | null> {
    const result = await query(
      `SELECT am.*, aaa.merchant_id AS agent_merchant_id
       FROM agent_mandates am
       LEFT JOIN ai_agent_apps aaa ON am.agent_id = aaa.agent_id
       WHERE am.id = $1`,
      [mandateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...this.mapRowToMandate(row),
      agentMerchantId: row.agent_merchant_id,
    };
  }

  async getActiveAppMandate(userId: string, agentId: string): Promise<AgentMandate | null> {
    const result = await query(
      `SELECT * FROM agent_mandates
       WHERE user_id = $1 AND agent_id = $2 AND type = 'app' AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId, agentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMandate(result.rows[0]);
  }

  async getChildMandates(parentMandateId: string): Promise<AgentMandate[]> {
    const result = await query(
      `SELECT * FROM agent_mandates
       WHERE parent_mandate_id = $1
       ORDER BY created_at DESC`,
      [parentMandateId]
    );

    return result.rows.map(row => this.mapRowToMandate(row));
  }

  private mapRowToMandate(row: any): AgentMandate {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      type: row.type,
      status: row.status,
      constraints: typeof row.constraints === 'string'
        ? JSON.parse(row.constraints)
        : row.constraints || {},
      parentMandateId: row.parent_mandate_id || undefined,
      paymentMethods: typeof row.payment_methods === 'string'
        ? JSON.parse(row.payment_methods)
        : row.payment_methods || [],
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      revokedAt: row.revoked_at,
      revokedReason: row.revoked_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
