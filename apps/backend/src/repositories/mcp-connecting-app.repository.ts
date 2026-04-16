import crypto from 'crypto';
import { pool } from '../config/database';

export type McpConnectingKeyPurpose = 'agentic_api' | 'mcp_proxy';

export interface McpConnectingAppRow {
  id: string;
  name: string;
  api_key: string;
  purpose: McpConnectingKeyPurpose;
  created_at: Date;
  revoked_at: Date | null;
}

function generateKey(): string {
  return `mcpc_${crypto.randomBytes(24).toString('hex')}`;
}

export class McpConnectingAppRepository {
  async create(name: string, purpose: McpConnectingKeyPurpose): Promise<{ row: McpConnectingAppRow; apiKey: string }> {
    const apiKey = generateKey();
    const result = await pool.query(
      `INSERT INTO mcp_connecting_app_keys (name, api_key, purpose)
       VALUES ($1, $2, $3)
       RETURNING id, name, api_key, purpose, created_at, revoked_at`,
      [name.trim() || 'Unnamed app', apiKey, purpose]
    );
    return { row: result.rows[0], apiKey };
  }

  async listAll(): Promise<McpConnectingAppRow[]> {
    const result = await pool.query(
      `SELECT id, name, api_key, COALESCE(purpose, 'mcp_proxy') AS purpose, created_at, revoked_at
       FROM mcp_connecting_app_keys
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async findActiveByApiKey(apiKey: string): Promise<McpConnectingAppRow | null> {
    const result = await pool.query(
      `SELECT id, name, api_key, COALESCE(purpose, 'mcp_proxy') AS purpose, created_at, revoked_at
       FROM mcp_connecting_app_keys
       WHERE api_key = $1 AND revoked_at IS NULL`,
      [apiKey]
    );
    return result.rows[0] || null;
  }

  async revoke(id: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE mcp_connecting_app_keys
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND revoked_at IS NULL`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const mcpConnectingAppRepository = new McpConnectingAppRepository();
