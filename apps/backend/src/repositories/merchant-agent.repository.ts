/**
 * Merchant Agent Repository
 * Database operations for merchant-agent associations
 */

import { query } from '../config/database';
import crypto from 'crypto';

/**
 * Merchant Agent entity
 */
export interface MerchantAgent {
  id: string;
  merchantId: string;
  agentId: string;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merchant Agent with agent details
 */
export interface MerchantAgentWithDetails extends MerchantAgent {
  agent?: {
    id: string;
    name: string;
    agentId: string;
    agentName: string;
    status: string;
  };
}

/**
 * Create Merchant Agent request
 */
export interface CreateMerchantAgentRequest {
  merchantId: string;
  agentId: string;
  config?: Record<string, unknown>;
}

export class MerchantAgentRepository {
  /**
   * Create a new merchant-agent association
   */
  async create(data: CreateMerchantAgentRequest): Promise<MerchantAgent> {
    const id = crypto.randomUUID();

    try {
      const result = await query(
        `INSERT INTO merchant_agents (id, merchant_id, agent_id, config, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [id, data.merchantId, data.agentId, JSON.stringify(data.config || {})]
      );

      return this.mapRowToMerchantAgent(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error('This agent is already associated with this merchant');
      }
      if (error.code === '42P01') {
        console.warn('[MerchantAgentRepository] Table does not exist');
        return this.createMockMerchantAgent(id, data);
      }
      throw error;
    }
  }

  /**
   * Get all agents for a merchant
   */
  async getByMerchantId(merchantId: string): Promise<MerchantAgentWithDetails[]> {
    try {
      const result = await query(
        `SELECT ma.*,
                a.id as agent_db_id, a.name as agent_name,
                a.agent_id as agent_agent_id, a.agent_name as agent_display_name,
                a.status as agent_status
         FROM merchant_agents ma
         LEFT JOIN ai_agents a ON ma.agent_id = a.id
         WHERE ma.merchant_id = $1
         ORDER BY ma.created_at DESC`,
        [merchantId]
      );

      return result.rows.map((row) => this.mapRowToMerchantAgentWithDetails(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get all merchants for an agent
   */
  async getByAgentId(agentId: string): Promise<MerchantAgent[]> {
    try {
      const result = await query(
        `SELECT * FROM merchant_agents WHERE agent_id = $1 ORDER BY created_at DESC`,
        [agentId]
      );

      return result.rows.map((row) => this.mapRowToMerchantAgent(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a specific merchant-agent association
   */
  async getByMerchantAndAgent(merchantId: string, agentId: string): Promise<MerchantAgent | null> {
    try {
      const result = await query(
        `SELECT * FROM merchant_agents WHERE merchant_id = $1 AND agent_id = $2`,
        [merchantId, agentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMerchantAgent(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update merchant-agent configuration
   */
  async updateConfig(
    merchantId: string,
    agentId: string,
    config: Record<string, unknown>
  ): Promise<MerchantAgent | null> {
    try {
      const result = await query(
        `UPDATE merchant_agents
         SET config = $3, updated_at = NOW()
         WHERE merchant_id = $1 AND agent_id = $2
         RETURNING *`,
        [merchantId, agentId, JSON.stringify(config)]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMerchantAgent(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update active status
   */
  async updateStatus(merchantId: string, agentId: string, isActive: boolean): Promise<MerchantAgent | null> {
    try {
      const result = await query(
        `UPDATE merchant_agents
         SET is_active = $3, updated_at = NOW()
         WHERE merchant_id = $1 AND agent_id = $2
         RETURNING *`,
        [merchantId, agentId, isActive]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMerchantAgent(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a merchant-agent association
   */
  async delete(merchantId: string, agentId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM merchant_agents WHERE merchant_id = $1 AND agent_id = $2`,
        [merchantId, agentId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      if (error.code === '42P01') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete all associations for a merchant
   */
  async deleteAllForMerchant(merchantId: string): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM merchant_agents WHERE merchant_id = $1`,
        [merchantId]
      );

      return result.rowCount ?? 0;
    } catch (error: any) {
      if (error.code === '42P01') {
        return 0;
      }
      throw error;
    }
  }

  private createMockMerchantAgent(id: string, data: CreateMerchantAgentRequest): MerchantAgent {
    const now = new Date();
    return {
      id,
      merchantId: data.merchantId,
      agentId: data.agentId,
      isActive: true,
      config: data.config || {},
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapRowToMerchantAgent(row: any): MerchantAgent {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      agentId: row.agent_id,
      isActive: row.is_active,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToMerchantAgentWithDetails(row: any): MerchantAgentWithDetails {
    return {
      ...this.mapRowToMerchantAgent(row),
      agent: row.agent_db_id
        ? {
            id: row.agent_db_id,
            name: row.agent_name,
            agentId: row.agent_agent_id,
            agentName: row.agent_display_name,
            status: row.agent_status,
          }
        : undefined,
    };
  }
}

export const merchantAgentRepository = new MerchantAgentRepository();
