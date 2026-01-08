import { query } from '../config/database';

export interface AgentActionRecord {
  id: string;
  userId: string;
  agentId: string;
  mandateId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: any;
  success: boolean;
  errorMessage: string | null;
  timestamp: Date;
}

export class AgentActionRepository {
  async log(
    userId: string,
    agentId: string,
    mandateId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: any,
    success: boolean,
    errorMessage?: string
  ): Promise<AgentActionRecord> {
    const result = await query(
      `INSERT INTO agent_actions (user_id, agent_id, mandate_id, action, resource_type, resource_id, metadata, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        agentId,
        mandateId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(metadata),
        success,
        errorMessage || null,
      ]
    );

    return this.mapRowToAction(result.rows[0]);
  }

  async getAgentActions(
    userId: string,
    agentId?: string,
    limit: number = 50
  ): Promise<AgentActionRecord[]> {
    let queryText = 'SELECT * FROM agent_actions WHERE user_id = $1';
    const params: any[] = [userId];

    if (agentId) {
      params.push(agentId);
      queryText += ` AND agent_id = $${params.length}`;
    }

    queryText += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows.map(row => this.mapRowToAction(row));
  }

  async getMandateStats(mandateId: string, date?: Date): Promise<any> {
    const targetDate = date || new Date();
    const result = await query(
      `SELECT
         COUNT(*) as total_actions,
         SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_actions,
         SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_actions
       FROM agent_actions
       WHERE mandate_id = $1
         AND DATE(timestamp) = $2`,
      [mandateId, targetDate.toISOString().split('T')[0]]
    );

    return result.rows[0];
  }

  private mapRowToAction(row: any): AgentActionRecord {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      mandateId: row.mandate_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      metadata: row.metadata,
      success: row.success,
      errorMessage: row.error_message,
      timestamp: row.timestamp,
    };
  }
}
