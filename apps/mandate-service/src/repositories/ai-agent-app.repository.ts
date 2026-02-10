import { query } from '../config/database';

export interface AIAgentApp {
  id: string;
  name: string;
  slug: string;
  description?: string;
  agent_id: string;
  agent_name: string;
  api_endpoint?: string;
  api_key?: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'suspended';
  merchant_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAIAgentAppRequest {
  name: string;
  slug: string;
  description?: string;
  agent_id: string;
  agent_name: string;
  api_endpoint?: string;
  api_key?: string;
  capabilities?: string[];
  merchant_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAIAgentAppRequest {
  name?: string;
  description?: string;
  agent_id?: string;
  agent_name?: string;
  api_endpoint?: string;
  api_key?: string;
  capabilities?: string[];
  status?: 'active' | 'inactive' | 'suspended';
  merchant_id?: string;
  metadata?: Record<string, any>;
}

export class AIAgentAppRepository {
  async create(data: CreateAIAgentAppRequest): Promise<AIAgentApp> {
    const result = await query(
      `INSERT INTO ai_agent_apps (name, slug, description, agent_id, agent_name, api_endpoint, api_key, capabilities, merchant_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.agent_id,
        data.agent_name,
        data.api_endpoint || null,
        data.api_key || null,
        JSON.stringify(data.capabilities || []),
        data.merchant_id || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToAgentApp(result.rows[0]);
  }

  async getAll(): Promise<AIAgentApp[]> {
    const result = await query('SELECT * FROM ai_agent_apps ORDER BY created_at DESC');
    return result.rows.map(row => this.mapRowToAgentApp(row));
  }

  async getById(id: string): Promise<AIAgentApp | null> {
    const result = await query('SELECT * FROM ai_agent_apps WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAgentApp(result.rows[0]);
  }

  async getBySlug(slug: string): Promise<AIAgentApp | null> {
    const result = await query('SELECT * FROM ai_agent_apps WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAgentApp(result.rows[0]);
  }

  async getByAgentId(agentId: string): Promise<AIAgentApp | null> {
    const result = await query('SELECT * FROM ai_agent_apps WHERE agent_id = $1', [agentId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAgentApp(result.rows[0]);
  }

  async getByMerchantId(merchantId: string): Promise<AIAgentApp[]> {
    const result = await query(
      'SELECT * FROM ai_agent_apps WHERE merchant_id = $1 ORDER BY created_at DESC',
      [merchantId]
    );
    return result.rows.map(row => this.mapRowToAgentApp(row));
  }

  async getActive(): Promise<AIAgentApp[]> {
    const result = await query(
      "SELECT * FROM ai_agent_apps WHERE status = 'active' ORDER BY created_at DESC"
    );
    return result.rows.map(row => this.mapRowToAgentApp(row));
  }

  async update(id: string, data: UpdateAIAgentAppRequest): Promise<AIAgentApp> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.agent_id !== undefined) {
      updates.push(`agent_id = $${paramIndex++}`);
      values.push(data.agent_id);
    }
    if (data.agent_name !== undefined) {
      updates.push(`agent_name = $${paramIndex++}`);
      values.push(data.agent_name);
    }
    if (data.api_endpoint !== undefined) {
      updates.push(`api_endpoint = $${paramIndex++}`);
      values.push(data.api_endpoint);
    }
    if (data.api_key !== undefined) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(data.api_key);
    }
    if (data.capabilities !== undefined) {
      updates.push(`capabilities = $${paramIndex++}`);
      values.push(JSON.stringify(data.capabilities));
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.merchant_id !== undefined) {
      updates.push(`merchant_id = $${paramIndex++}`);
      values.push(data.merchant_id);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE ai_agent_apps SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToAgentApp(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM ai_agent_apps WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapRowToAgentApp(row: any): AIAgentApp {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      api_endpoint: row.api_endpoint,
      api_key: row.api_key,
      capabilities: typeof row.capabilities === 'string'
        ? JSON.parse(row.capabilities)
        : row.capabilities || [],
      status: row.status,
      merchant_id: row.merchant_id,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
