import { pool } from '../config/database';
import {
  Merchant,
  MerchantStatus,
  MerchantTier,
  CreateMerchantRequest,
  MerchantSettings,
} from '@agentic-commerce/shared-types';
import crypto from 'crypto';

export class MerchantRepository {
  async create(request: CreateMerchantRequest): Promise<Merchant> {
    const apiKey = this.generateApiKey('mk');
    const apiSecret = this.generateApiKey('sk');
    const webhookSecret = request.webhookUrl ? this.generateApiKey('whsec') : null;

    const defaultSettings: MerchantSettings = {
      supportsCartMandate: true,
      supportsIntentMandate: true,
      supportsPaymentMandate: true,
      maxTransactionAmount: request.tier === MerchantTier.ENTERPRISE ? 100000 :
                           request.tier === MerchantTier.BUSINESS ? 50000 : 10000,
      dailyTransactionLimit: request.tier === MerchantTier.ENTERPRISE ? 1000000 :
                            request.tier === MerchantTier.BUSINESS ? 500000 : 100000,
      monthlyTransactionLimit: request.tier === MerchantTier.ENTERPRISE ? 10000000 :
                              request.tier === MerchantTier.BUSINESS ? 5000000 : 1000000,
      requiresWebhookVerification: true,
      requires2FA: false,
      allowedOrigins: [],
      enableAutoApproval: false,
      autoApprovalThreshold: 100,
      notifyOnMandateCreated: true,
      notifyOnIntentCreated: true,
      notifyOnPaymentExecuted: true,
    };

    const query = `
      INSERT INTO merchants (
        name, business_name, email, website, status, tier,
        api_key, api_secret, webhook_url, webhook_secret, settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      request.name,
      request.businessName,
      request.email,
      request.website || null,
      MerchantStatus.PENDING,
      request.tier,
      apiKey,
      apiSecret,
      request.webhookUrl || null,
      webhookSecret,
      JSON.stringify(defaultSettings),
    ];

    const result = await pool.query(query, values);
    return this.mapRowToMerchant(result.rows[0]);
  }

  async getById(id: string): Promise<Merchant | null> {
    const query = 'SELECT * FROM merchants WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMerchant(result.rows[0]);
  }

  async getByApiKey(apiKey: string): Promise<Merchant | null> {
    const query = 'SELECT * FROM merchants WHERE api_key = $1';
    const result = await pool.query(query, [apiKey]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMerchant(result.rows[0]);
  }

  async getByEmail(email: string): Promise<Merchant | null> {
    const query = 'SELECT * FROM merchants WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMerchant(result.rows[0]);
  }

  async updateStatus(id: string, status: MerchantStatus): Promise<Merchant> {
    const query = `
      UPDATE merchants
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);
    return this.mapRowToMerchant(result.rows[0]);
  }

  async updateSettings(id: string, settings: Partial<MerchantSettings>): Promise<Merchant> {
    // Get current merchant to merge settings
    const merchant = await this.getById(id);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const updatedSettings = { ...merchant.settings, ...settings };

    const query = `
      UPDATE merchants
      SET settings = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [JSON.stringify(updatedSettings), id]);
    return this.mapRowToMerchant(result.rows[0]);
  }

  async updateWebhook(id: string, webhookUrl: string | null): Promise<Merchant> {
    const webhookSecret = webhookUrl ? this.generateApiKey('whsec') : null;

    const query = `
      UPDATE merchants
      SET webhook_url = $1, webhook_secret = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [webhookUrl, webhookSecret, id]);
    return this.mapRowToMerchant(result.rows[0]);
  }

  async rotateApiKeys(id: string): Promise<{ apiKey: string; apiSecret: string }> {
    const apiKey = this.generateApiKey('mk');
    const apiSecret = this.generateApiKey('sk');

    const query = `
      UPDATE merchants
      SET api_key = $1, api_secret = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    await pool.query(query, [apiKey, apiSecret, id]);

    return { apiKey, apiSecret };
  }

  async updateLastActivity(id: string): Promise<void> {
    const query = `
      UPDATE merchants
      SET last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pool.query(query, [id]);
  }

  async list(status?: MerchantStatus, limit: number = 100, offset: number = 0): Promise<Merchant[]> {
    let query = 'SELECT * FROM merchants';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRowToMerchant(row));
  }

  async verifyApiSecret(apiKey: string, apiSecret: string): Promise<boolean> {
    const query = 'SELECT api_secret FROM merchants WHERE api_key = $1 AND status = $2';
    const result = await pool.query(query, [apiKey, MerchantStatus.ACTIVE]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].api_secret === apiSecret;
  }

  private generateApiKey(prefix: string): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  private mapRowToMerchant(row: any): Merchant {
    return {
      id: row.id,
      name: row.name,
      businessName: row.business_name,
      email: row.email,
      website: row.website,
      status: row.status as MerchantStatus,
      tier: row.tier as MerchantTier,
      apiKey: row.api_key,
      apiSecret: row.api_secret,
      webhookUrl: row.webhook_url,
      webhookSecret: row.webhook_secret,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at,
    };
  }
}
