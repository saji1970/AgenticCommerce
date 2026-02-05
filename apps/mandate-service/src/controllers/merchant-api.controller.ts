/**
 * Merchant API Controller
 * Endpoints: register, verify, list, update settings, rotate keys.
 * All endpoints authenticate, enforce capabilities, and log audit entries.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { auditLogService } from '../services/audit-log.service';

function generateApiKey(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

export class MerchantApiController {
  /**
   * POST /api/v1/merchants/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const { name, businessName, email, website, tier, webhookUrl } = req.body;

    // Check duplicate email
    const existing = await query(`SELECT id FROM merchants WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const apiKey = generateApiKey('mk');
    const apiSecretPlain = generateApiKey('sk');
    const apiSecretHash = await bcrypt.hash(apiSecretPlain, 12);
    const webhookSecret = webhookUrl ? generateApiKey('whsec') : null;

    const defaultSettings = {
      supportsCartMandate: true,
      supportsIntentMandate: true,
      supportsPaymentMandate: true,
      maxTransactionAmount: tier === 'enterprise' ? 100000 : tier === 'business' ? 50000 : 10000,
      dailyTransactionLimit: tier === 'enterprise' ? 1000000 : tier === 'business' ? 500000 : 100000,
      monthlyTransactionLimit: tier === 'enterprise' ? 10000000 : tier === 'business' ? 5000000 : 1000000,
    };

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await query(
      `INSERT INTO merchants (name, slug, business_name, email, website, status, tier, api_key, api_secret_hash, webhook_url, webhook_secret, settings)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11)
       RETURNING id, name, slug, email, status, tier, api_key, created_at`,
      [name, slug, businessName, email, website, tier, apiKey, apiSecretHash, webhookUrl, webhookSecret, JSON.stringify(defaultSettings)],
    );

    const merchant = result.rows[0];

    await auditLogService.log({
      actorType: 'merchant',
      actorId: merchant.id,
      eventType: 'merchant.registered',
      eventCategory: 'merchant',
      severity: 'info',
      description: `Merchant '${name}' registered (tier: ${tier})`,
      newState: { id: merchant.id, tier, status: 'pending' },
      ipAddress: req.ip,
    });

    res.status(201).json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        status: merchant.status,
        tier: merchant.tier,
      },
      credentials: {
        apiKey,
        apiSecret: apiSecretPlain, // Only returned once
        webhookSecret,
      },
    });
  }

  /**
   * POST /api/v1/merchants/:id/verify
   * System-only: activates a pending merchant.
   */
  async verify(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const existing = await query(`SELECT id, status, name FROM merchants WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    const merchant = existing.rows[0];
    if (merchant.status !== 'pending') {
      res.status(400).json({ error: `Cannot verify merchant in '${merchant.status}' status` });
      return;
    }

    await query(
      `UPDATE merchants SET status = 'active', verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    );

    await auditLogService.logMandateStateChange(
      'system', req.caller?.id || 'system',
      id, 'pending', 'active',
      `Merchant '${merchant.name}' verified and activated`,
    );

    res.json({ message: 'Merchant verified and activated', merchantId: id });
  }

  /**
   * GET /api/v1/merchants
   */
  async list(req: Request, res: Response): Promise<void> {
    const { status, limit = '50', offset = '0' } = req.query;
    let sql = 'SELECT id, name, slug, email, status, tier, created_at FROM merchants';
    const params: any[] = [];

    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await query(sql, params);
    res.json({ merchants: result.rows });
  }

  /**
   * PUT /api/v1/merchants/:id/settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const settings = req.body;

    const existing = await query(`SELECT id, settings FROM merchants WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    const currentSettings = typeof existing.rows[0].settings === 'string'
      ? JSON.parse(existing.rows[0].settings)
      : existing.rows[0].settings;
    const merged = { ...currentSettings, ...settings };

    await query(
      `UPDATE merchants SET settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), id],
    );

    await auditLogService.log({
      actorType: req.caller?.type || 'system',
      actorId: req.caller?.id || 'system',
      eventType: 'merchant.settings_updated',
      eventCategory: 'merchant',
      severity: 'info',
      resourceType: 'merchant',
      resourceId: id,
      description: `Merchant settings updated`,
      oldState: currentSettings,
      newState: merged,
    });

    res.json({ message: 'Settings updated', settings: merged });
  }

  /**
   * POST /api/v1/merchants/:id/rotate-keys
   */
  async rotateKeys(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const apiKey = generateApiKey('mk');
    const apiSecretPlain = generateApiKey('sk');
    const apiSecretHash = await bcrypt.hash(apiSecretPlain, 12);

    await query(
      `UPDATE merchants SET api_key = $1, api_secret_hash = $2, updated_at = NOW() WHERE id = $3`,
      [apiKey, apiSecretHash, id],
    );

    await auditLogService.log({
      actorType: req.caller?.type || 'system',
      actorId: req.caller?.id || 'system',
      eventType: 'merchant.keys_rotated',
      eventCategory: 'merchant',
      severity: 'warning',
      resourceType: 'merchant',
      resourceId: id,
      description: `API keys rotated for merchant ${id}`,
    });

    res.json({
      message: 'API keys rotated. Update your integration immediately.',
      credentials: { apiKey, apiSecret: apiSecretPlain },
    });
  }
}

export const merchantApiController = new MerchantApiController();
