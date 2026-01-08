import { pool } from '../config/database';
import {
  AP2WebhookDelivery,
  AP2WebhookEvent,
  AP2WebhookPayload,
} from '@agentic-commerce/shared-types';

export class AP2WebhookRepository {
  async create(
    merchantId: string,
    event: AP2WebhookEvent,
    payload: AP2WebhookPayload,
    url: string
  ): Promise<AP2WebhookDelivery> {
    const query = `
      INSERT INTO ap2_webhook_deliveries (
        merchant_id, event, payload, url, next_attempt_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      merchantId,
      event,
      JSON.stringify(payload),
      url,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToWebhook(result.rows[0]);
  }

  async getById(id: string): Promise<AP2WebhookDelivery | null> {
    const query = 'SELECT * FROM ap2_webhook_deliveries WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWebhook(result.rows[0]);
  }

  async getPendingDeliveries(limit: number = 10): Promise<AP2WebhookDelivery[]> {
    const query = `
      SELECT * FROM ap2_webhook_deliveries
      WHERE delivered_at IS NULL
        AND failed_at IS NULL
        AND attempts < max_attempts
        AND next_attempt_at <= CURRENT_TIMESTAMP
      ORDER BY next_attempt_at ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToWebhook(row));
  }

  async recordAttempt(
    id: string,
    success: boolean,
    responseStatus?: number,
    responseBody?: string
  ): Promise<AP2WebhookDelivery> {
    const webhook = await this.getById(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const nextAttempts = webhook.attempts + 1;
    const maxAttempts = 5;

    let query: string;
    const values: any[] = [nextAttempts, responseStatus || null, responseBody || null];

    if (success) {
      query = `
        UPDATE ap2_webhook_deliveries
        SET attempts = $1,
            last_attempt_at = CURRENT_TIMESTAMP,
            delivered_at = CURRENT_TIMESTAMP,
            response_status = $2,
            response_body = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      values.push(id);
    } else if (nextAttempts >= maxAttempts) {
      // Max attempts reached, mark as failed
      query = `
        UPDATE ap2_webhook_deliveries
        SET attempts = $1,
            last_attempt_at = CURRENT_TIMESTAMP,
            failed_at = CURRENT_TIMESTAMP,
            failure_reason = 'Max delivery attempts exceeded',
            response_status = $2,
            response_body = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      values.push(id);
    } else {
      // Schedule retry with exponential backoff
      const backoffMinutes = Math.pow(2, nextAttempts); // 2, 4, 8, 16, 32 minutes

      query = `
        UPDATE ap2_webhook_deliveries
        SET attempts = $1,
            last_attempt_at = CURRENT_TIMESTAMP,
            next_attempt_at = CURRENT_TIMESTAMP + INTERVAL '${backoffMinutes} minutes',
            response_status = $2,
            response_body = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      values.push(id);
    }

    const result = await pool.query(query, values);
    return this.mapRowToWebhook(result.rows[0]);
  }

  async markAsDelivered(id: string): Promise<AP2WebhookDelivery> {
    const query = `
      UPDATE ap2_webhook_deliveries
      SET delivered_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return this.mapRowToWebhook(result.rows[0]);
  }

  async markAsFailed(id: string, reason: string): Promise<AP2WebhookDelivery> {
    const query = `
      UPDATE ap2_webhook_deliveries
      SET failed_at = CURRENT_TIMESTAMP,
          failure_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [reason, id]);
    return this.mapRowToWebhook(result.rows[0]);
  }

  async getByMerchant(
    merchantId: string,
    options?: {
      event?: AP2WebhookEvent;
      delivered?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<AP2WebhookDelivery[]> {
    let query = 'SELECT * FROM ap2_webhook_deliveries WHERE merchant_id = $1';
    const params: any[] = [merchantId];
    let paramCount = 1;

    if (options?.event) {
      paramCount++;
      query += ` AND event = $${paramCount}`;
      params.push(options.event);
    }

    if (options?.delivered !== undefined) {
      if (options.delivered) {
        query += ` AND delivered_at IS NOT NULL`;
      } else {
        query += ` AND delivered_at IS NULL AND failed_at IS NULL`;
      }
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRowToWebhook(row));
  }

  async getDeliveryStats(merchantId: string, period: 'day' | 'week' | 'month'): Promise<{
    totalWebhooks: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
  }> {
    let periodFilter: string;
    switch (period) {
      case 'day':
        periodFilter = "created_at >= CURRENT_DATE";
        break;
      case 'week':
        periodFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        periodFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
    }

    const query = `
      SELECT
        COUNT(*) as total_webhooks,
        SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN failed_at IS NOT NULL THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN delivered_at IS NULL AND failed_at IS NULL THEN 1 ELSE 0 END) as pending
      FROM ap2_webhook_deliveries
      WHERE merchant_id = $1 AND ${periodFilter}
    `;

    const result = await pool.query(query, [merchantId]);
    const row = result.rows[0];

    const totalWebhooks = parseInt(row.total_webhooks);
    const delivered = parseInt(row.delivered || 0);
    const failed = parseInt(row.failed || 0);
    const pending = parseInt(row.pending || 0);
    const successRate = totalWebhooks > 0 ? (delivered / totalWebhooks) * 100 : 0;

    return {
      totalWebhooks,
      delivered,
      failed,
      pending,
      successRate,
    };
  }

  async cleanupOldDeliveries(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM ap2_webhook_deliveries
      WHERE (delivered_at IS NOT NULL OR failed_at IS NOT NULL)
        AND created_at < CURRENT_DATE - INTERVAL '${daysOld} days'
    `;

    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  private mapRowToWebhook(row: any): AP2WebhookDelivery {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      event: row.event as AP2WebhookEvent,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      url: row.url,
      attempts: row.attempts,
      lastAttemptAt: row.last_attempt_at,
      nextAttemptAt: row.next_attempt_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      failureReason: row.failure_reason,
    };
  }
}
