import { query } from '../config/database';

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  api_key: string;
  api_secret: string;
  webhook_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMerchantRequest {
  name: string;
  slug: string;
  description?: string;
  api_key: string;
  api_secret: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMerchantRequest {
  name?: string;
  description?: string;
  webhook_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
}

export class MerchantRepository {
  async create(data: CreateMerchantRequest): Promise<Merchant> {
    const result = await query(
      `INSERT INTO merchants (name, slug, description, api_key, api_secret, webhook_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.api_key,
        data.api_secret,
        data.webhook_url || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToMerchant(result.rows[0]);
  }

  async getAll(): Promise<Merchant[]> {
    const result = await query('SELECT * FROM merchants ORDER BY created_at DESC');
    return result.rows.map(row => this.mapRowToMerchant(row));
  }

  async getById(id: string): Promise<Merchant | null> {
    const result = await query('SELECT * FROM merchants WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToMerchant(result.rows[0]);
  }

  async getBySlug(slug: string): Promise<Merchant | null> {
    const result = await query('SELECT * FROM merchants WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToMerchant(result.rows[0]);
  }

  async getByApiKey(apiKey: string): Promise<Merchant | null> {
    const result = await query('SELECT * FROM merchants WHERE api_key = $1', [apiKey]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToMerchant(result.rows[0]);
  }

  async update(id: string, data: UpdateMerchantRequest): Promise<Merchant> {
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
    if (data.webhook_url !== undefined) {
      updates.push(`webhook_url = $${paramIndex++}`);
      values.push(data.webhook_url);
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
      `UPDATE merchants SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToMerchant(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM merchants WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapRowToMerchant(row: any): Merchant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      api_key: row.api_key,
      api_secret: row.api_secret,
      webhook_url: row.webhook_url,
      status: row.status,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
