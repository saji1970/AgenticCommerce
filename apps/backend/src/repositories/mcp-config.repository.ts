import { MCPServerConfig, CreateMCPServerConfigDTO } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class MCPServerConfigRepository {
  async create(configData: CreateMCPServerConfigDTO): Promise<MCPServerConfig> {
    const result = await query(
      `INSERT INTO mcp_server_configs (name, server_type, endpoint_url, config, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        configData.name,
        configData.serverType,
        configData.endpointUrl,
        JSON.stringify(configData.config),
        configData.isActive !== undefined ? configData.isActive : true,
      ]
    );

    return this.mapToConfig(result.rows[0]);
  }

  async findById(id: string): Promise<MCPServerConfig | null> {
    const result = await query(
      'SELECT * FROM mcp_server_configs WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapToConfig(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<MCPServerConfig | null> {
    const result = await query(
      'SELECT * FROM mcp_server_configs WHERE name = $1',
      [name]
    );

    return result.rows.length > 0 ? this.mapToConfig(result.rows[0]) : null;
  }

  async findAll(): Promise<MCPServerConfig[]> {
    const result = await query(
      'SELECT * FROM mcp_server_configs ORDER BY created_at ASC'
    );

    return result.rows.map(row => this.mapToConfig(row));
  }

  async findAllActive(): Promise<MCPServerConfig[]> {
    const result = await query(
      `SELECT * FROM mcp_server_configs
       WHERE is_active = true
       ORDER BY created_at ASC`
    );

    return result.rows.map(row => this.mapToConfig(row));
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<void> {
    await query(
      `UPDATE mcp_server_configs
       SET is_active = $2
       WHERE id = $1`,
      [id, isActive]
    );
  }

  async update(id: string, updates: Partial<CreateMCPServerConfigDTO>): Promise<MCPServerConfig | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.serverType !== undefined) {
      updateFields.push(`server_type = $${paramCount++}`);
      values.push(updates.serverType);
    }
    if (updates.endpointUrl !== undefined) {
      updateFields.push(`endpoint_url = $${paramCount++}`);
      values.push(updates.endpointUrl);
    }
    if (updates.config !== undefined) {
      updateFields.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(updates.config));
    }
    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE mcp_server_configs
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapToConfig(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM mcp_server_configs WHERE id = $1',
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapToConfig(row: any): MCPServerConfig {
    return {
      id: row.id,
      name: row.name,
      serverType: row.server_type,
      endpointUrl: row.endpoint_url,
      config: row.config,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
