/**
 * Mandate API Controller
 * Full lifecycle: create draft, submit signed mandate, activate, revoke,
 * get status, validate for execution.
 * Every endpoint authenticates, enforces capability checks, logs audit.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/database';
import { mandateHasher } from '../crypto/mandate-hasher';
import { signatureService } from '../crypto/signature-service';
import { mandateLifecycleService, MandateState } from '../services/mandate-lifecycle.service';
import { securityGuardService } from '../services/security-guard.service';
import { auditLogService } from '../services/audit-log.service';

export class MandateApiController {
  /**
   * POST /api/v1/mandates/draft
   * Create a new mandate in 'draft' state. No signature required yet.
   */
  async createDraft(req: Request, res: Response): Promise<void> {
    const {
      userId, agentId, merchantId, type, constraints,
      maxAmount, dailyLimit, monthlyLimit, maxFrequency, validUntil,
    } = req.body;

    // Verify agent exists and is active
    const agent = await query(`SELECT agent_id, name, status FROM ai_agent_apps WHERE agent_id = $1`, [agentId]);
    if (agent.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (agent.rows[0].status !== 'active') {
      res.status(403).json({ error: `Agent is ${agent.rows[0].status}` });
      return;
    }

    const mandateId = crypto.randomUUID();
    const validFrom = new Date().toISOString();

    // Compute mandate hash for integrity binding
    const hashInput = {
      mandateId, userId, agentId,
      merchantId, type, constraints: constraints || {},
      maxAmount, dailyLimit, monthlyLimit, maxFrequency,
      validFrom, validUntil,
    };
    const mandateHash = mandateHasher.computeHash(hashInput);

    const result = await query(
      `INSERT INTO mandates (
        id, user_id, agent_id, merchant_id, type, status, constraints,
        max_amount, daily_limit, monthly_limit, max_frequency,
        mandate_hash, valid_from, valid_until
      ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        mandateId, userId, agentId, merchantId || null, type,
        JSON.stringify(constraints || {}),
        maxAmount || null, dailyLimit || null, monthlyLimit || null,
        maxFrequency || null, mandateHash, validFrom, validUntil || null,
      ],
    );

    await auditLogService.logMandateStateChange(
      'system', req.caller?.id || 'system',
      mandateId, '', 'draft',
      `Mandate ${mandateId} created (type: ${type}, agent: ${agentId})`,
      { userId, agentId, type },
    );

    const mandateText = mandateHasher.generateMandateText(hashInput);

    res.status(201).json({
      mandate: {
        id: mandateId,
        userId,
        agentId,
        type,
        status: 'draft',
        mandateHash,
        validFrom,
        validUntil: validUntil || null,
      },
      mandateText, // Human-readable text to show the user for signing
    });
  }

  /**
   * POST /api/v1/mandates/submit-signed
   * User submits their signature. Transitions draft → awaiting_consent.
   */
  async submitSigned(req: Request, res: Response): Promise<void> {
    const {
      mandateId, userId, publicKeyId, signatureData,
      signatureAlgorithm, mandateText, signatureImageUrl,
      deviceInfo, biometricType,
    } = req.body;

    // Load mandate
    const mandateResult = await query(`SELECT * FROM mandates WHERE id = $1`, [mandateId]);
    if (mandateResult.rows.length === 0) {
      res.status(404).json({ error: 'Mandate not found' });
      return;
    }
    const mandate = mandateResult.rows[0];

    // Ownership check
    if (mandate.user_id !== userId) {
      res.status(403).json({ error: 'Not authorized to sign this mandate' });
      return;
    }

    // State transition check
    const transition = await mandateLifecycleService.attemptTransition(
      mandateId, mandate.status as MandateState, 'awaiting_consent',
      'user', userId,
    );
    if (!transition.allowed) {
      res.status(400).json({ error: transition.error });
      return;
    }

    // Load user's public key
    const keyResult = await query(
      `SELECT public_key_pem, key_algorithm FROM user_public_keys WHERE key_id = $1 AND user_id = $2 AND is_active = true`,
      [publicKeyId, userId],
    );
    if (keyResult.rows.length === 0) {
      res.status(400).json({ error: 'Public key not found or revoked' });
      return;
    }

    // Verify signature against mandate hash
    const isValid = signatureService.verifyRaw(
      mandate.mandate_hash,
      signatureData,
      keyResult.rows[0].public_key_pem,
      signatureAlgorithm || keyResult.rows[0].key_algorithm,
    );
    if (!isValid) {
      await auditLogService.logSecurityViolation(
        'user', userId,
        'security.invalid_mandate_signature',
        `User ${userId} provided invalid signature for mandate ${mandateId}`,
        mandateId,
      );
      res.status(400).json({ error: 'Signature verification failed' });
      return;
    }

    // Store signature
    const sigId = crypto.randomUUID();
    await query(
      `INSERT INTO mandate_signatures (
        id, mandate_id, user_id, public_key_id, mandate_text, mandate_hash,
        signature_data, signature_algorithm, signature_image_url,
        signature_timestamp, verification_status, device_info, biometric_type
      ) VALUES ($1, $2, $3, (SELECT id FROM user_public_keys WHERE key_id = $4), $5, $6, $7, $8, $9, NOW(), 'verified', $10, $11)`,
      [
        sigId, mandateId, userId, publicKeyId, mandateText,
        mandate.mandate_hash, signatureData, signatureAlgorithm || 'Ed25519',
        signatureImageUrl || null,
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        biometricType || null,
      ],
    );

    // Update mandate status
    await query(
      `UPDATE mandates SET status = 'awaiting_consent', signature_id = $1, updated_at = NOW() WHERE id = $2`,
      [sigId, mandateId],
    );

    await auditLogService.logSignatureEvent(
      userId, mandateId,
      `User ${userId} signed mandate ${mandateId}`,
      { publicKeyId, biometricType },
    );

    res.json({
      message: 'Mandate signed and awaiting final activation',
      mandateId,
      status: 'awaiting_consent',
      signatureId: sigId,
    });
  }

  /**
   * POST /api/v1/mandates/:id/activate
   * Transitions awaiting_consent → active.
   */
  async activate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const mandateResult = await query(`SELECT * FROM mandates WHERE id = $1`, [id]);
    if (mandateResult.rows.length === 0) {
      res.status(404).json({ error: 'Mandate not found' });
      return;
    }
    const mandate = mandateResult.rows[0];

    const transition = await mandateLifecycleService.attemptTransition(
      id, mandate.status as MandateState, 'active',
      req.caller?.type || 'system', req.caller?.id || 'system',
    );
    if (!transition.allowed) {
      res.status(400).json({ error: transition.error });
      return;
    }

    // Verify signature exists
    if (!mandate.signature_id) {
      res.status(400).json({ error: 'Cannot activate: mandate has no signature' });
      return;
    }

    await query(
      `UPDATE mandates SET status = 'active', activated_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    );

    res.json({ message: 'Mandate activated', mandateId: id, status: 'active' });
  }

  /**
   * POST /api/v1/mandates/:id/revoke
   */
  async revoke(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    const mandateResult = await query(`SELECT * FROM mandates WHERE id = $1`, [id]);
    if (mandateResult.rows.length === 0) {
      res.status(404).json({ error: 'Mandate not found' });
      return;
    }
    const mandate = mandateResult.rows[0];

    const transition = await mandateLifecycleService.attemptTransition(
      id, mandate.status as MandateState, 'revoked',
      req.caller?.type || 'user', req.caller?.id || 'unknown',
    );
    if (!transition.allowed) {
      res.status(400).json({ error: transition.error });
      return;
    }

    await query(
      `UPDATE mandates SET status = 'revoked', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason, id],
    );

    res.json({ message: 'Mandate revoked', mandateId: id, status: 'revoked' });
  }

  /**
   * GET /api/v1/mandates/:id
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const result = await query(
      `SELECT m.*, a.name as agent_name, a.agent_name as agent_display_name
       FROM mandates m
       LEFT JOIN ai_agent_apps a ON m.agent_id = a.agent_id
       WHERE m.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Mandate not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      mandate: {
        id: row.id,
        userId: row.user_id,
        agentId: row.agent_id,
        agentName: row.agent_display_name || row.agent_name,
        merchantId: row.merchant_id,
        type: row.type,
        status: row.status,
        constraints: row.constraints,
        maxAmount: row.max_amount ? parseFloat(row.max_amount) : null,
        dailyLimit: row.daily_limit ? parseFloat(row.daily_limit) : null,
        monthlyLimit: row.monthly_limit ? parseFloat(row.monthly_limit) : null,
        maxFrequency: row.max_frequency,
        mandateHash: row.mandate_hash,
        amountUsed: parseFloat(row.amount_used || '0'),
        amountUsedToday: parseFloat(row.amount_used_today || '0'),
        amountUsedMonth: parseFloat(row.amount_used_month || '0'),
        transactionsToday: row.transactions_today || 0,
        validFrom: row.valid_from,
        validUntil: row.valid_until,
        activatedAt: row.activated_at,
        revokedAt: row.revoked_at,
        revokedReason: row.revoked_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  }

  /**
   * POST /api/v1/mandates/validate
   * Agent validates a mandate before attempting execution.
   * Runs all security checks (replay, expiry, limits, auth).
   */
  async validateForExecution(req: Request, res: Response): Promise<void> {
    const { mandateId, agentId, operationType, amount, nonce, timestamp, signature } = req.body;

    // Load mandate
    const mandateResult = await query(`SELECT * FROM mandates WHERE id = $1`, [mandateId]);
    if (mandateResult.rows.length === 0) {
      res.status(404).json({ error: 'Mandate not found', valid: false });
      return;
    }
    const m = mandateResult.rows[0];

    // Reset daily/monthly counters if needed
    await this.resetCountersIfNeeded(m);

    // Check mandate is active
    if (m.status !== 'active') {
      res.status(400).json({ valid: false, error: `Mandate status is '${m.status}', must be 'active'` });
      return;
    }

    // Run comprehensive security checks
    const check = await securityGuardService.preExecutionCheck({
      nonce,
      agentId,
      mandateId,
      mandateAgentId: m.agent_id,
      mandateType: m.type,
      mandateStatus: m.status,
      requestedOperation: operationType,
      requestedAmount: amount,
      validUntil: m.valid_until ? new Date(m.valid_until) : null,
      maxAmount: m.max_amount ? parseFloat(m.max_amount) : undefined,
      dailyLimit: m.daily_limit ? parseFloat(m.daily_limit) : undefined,
      monthlyLimit: m.monthly_limit ? parseFloat(m.monthly_limit) : undefined,
      maxFrequency: m.max_frequency,
      amountUsed: parseFloat(m.amount_used || '0'),
      amountUsedToday: parseFloat(m.amount_used_today || '0'),
      amountUsedMonth: parseFloat(m.amount_used_month || '0'),
      transactionsToday: m.transactions_today || 0,
    });

    if (!check.passed) {
      res.status(403).json({ valid: false, violation: check.violation, error: check.error });
      return;
    }

    res.json({
      valid: true,
      mandate: {
        id: m.id,
        type: m.type,
        status: m.status,
        remainingDaily: m.daily_limit ? parseFloat(m.daily_limit) - parseFloat(m.amount_used_today || '0') : null,
        remainingMonthly: m.monthly_limit ? parseFloat(m.monthly_limit) - parseFloat(m.amount_used_month || '0') : null,
        transactionsRemainingToday: m.max_frequency ? m.max_frequency - (m.transactions_today || 0) : null,
      },
    });
  }

  /**
   * GET /api/v1/mandates/user/:userId
   */
  async getUserMandates(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { status, type } = req.query;

    let sql = `SELECT m.*, a.name as agent_name FROM mandates m
               LEFT JOIN ai_agent_apps a ON m.agent_id = a.agent_id
               WHERE m.user_id = $1`;
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      sql += ` AND m.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND m.type = $${params.length}`;
    }
    sql += ` ORDER BY m.created_at DESC`;

    const result = await query(sql, params);
    res.json({ mandates: result.rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      type: row.type,
      status: row.status,
      validUntil: row.valid_until,
      createdAt: row.created_at,
    }))});
  }

  /**
   * Reset daily/monthly counters if the date has rolled over.
   */
  private async resetCountersIfNeeded(mandate: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (!mandate.last_reset_date || mandate.last_reset_date.toISOString?.().split('T')[0] !== today) {
      updates.push(`amount_used_today = 0, transactions_today = 0, last_reset_date = $${idx++}`);
      params.push(today);
    }

    const lastMonth = mandate.last_month_reset?.toISOString?.().substring(0, 7);
    if (!lastMonth || lastMonth !== currentMonth) {
      updates.push(`amount_used_month = 0, last_month_reset = $${idx++}`);
      params.push(today);
    }

    if (updates.length > 0) {
      params.push(mandate.id);
      await query(
        `UPDATE mandates SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        params,
      );
    }
  }
}

export const mandateApiController = new MandateApiController();
