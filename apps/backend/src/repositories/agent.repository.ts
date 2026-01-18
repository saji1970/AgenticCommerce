import { query } from '../config/database';

export interface AIAgent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  agentId: string;
  agentName: string;
  apiEndpoint?: string;
  apiKey?: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentRequest {
  name: string;
  slug: string;
  description?: string;
  agentId: string;
  agentName: string;
  apiEndpoint?: string;
  apiKey?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  agentId?: string;
  agentName?: string;
  apiEndpoint?: string;
  apiKey?: string;
  capabilities?: string[];
  status?: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
}

export class AgentRepository {
  async create(data: CreateAgentRequest): Promise<AIAgent> {
    const result = await query(
      `INSERT INTO ai_agents (name, slug, description, agent_id, agent_name, api_endpoint, api_key, capabilities, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.agentId,
        data.agentName,
        data.apiEndpoint || null,
        data.apiKey || null,
        JSON.stringify(data.capabilities || []),
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToAgent(result.rows[0]);
  }

  async getAll(): Promise<AIAgent[]> {
    const result = await query('SELECT * FROM ai_agents ORDER BY created_at DESC');
    return result.rows.map(row => this.mapRowToAgent(row));
  }

  async getById(id: string): Promise<AIAgent | null> {
    const result = await query('SELECT * FROM ai_agents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAgent(result.rows[0]);
  }

  async getBySlug(slug: string): Promise<AIAgent | null> {
    const result = await query('SELECT * FROM ai_agents WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAgent(result.rows[0]);
  }

  async getByAgentId(agentId: string): Promise<AIAgent | null> {
    const result = await query('SELECT * FROM ai_agents WHERE agent_id = $1', [agentId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAgent(result.rows[0]);
  }

  async getActive(): Promise<AIAgent[]> {
    const result = await query(
      "SELECT * FROM ai_agents WHERE status = 'active' ORDER BY created_at DESC"
    );
    return result.rows.map(row => this.mapRowToAgent(row));
  }

  async update(id: string, data: UpdateAgentRequest): Promise<AIAgent> {
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
    if (data.agentId !== undefined) {
      updates.push(`agent_id = $${paramIndex++}`);
      values.push(data.agentId);
    }
    if (data.agentName !== undefined) {
      updates.push(`agent_name = $${paramIndex++}`);
      values.push(data.agentName);
    }
    if (data.apiEndpoint !== undefined) {
      updates.push(`api_endpoint = $${paramIndex++}`);
      values.push(data.apiEndpoint);
    }
    if (data.apiKey !== undefined) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(data.apiKey);
    }
    if (data.capabilities !== undefined) {
      updates.push(`capabilities = $${paramIndex++}`);
      values.push(JSON.stringify(data.capabilities));
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE ai_agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToAgent(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM ai_agents WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapRowToAgent(row: any): AIAgent {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      agentId: row.agent_id,
      agentName: row.agent_name,
      apiEndpoint: row.api_endpoint,
      apiKey: row.api_key,
      capabilities: typeof row.capabilities === 'string' 
        ? JSON.parse(row.capabilities) 
        : row.capabilities || [],
      status: row.status,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
