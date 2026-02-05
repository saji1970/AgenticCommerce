/**
 * Payment Authorization Controller
 * Endpoints: request authorization, issue signed artifact, receive callback.
 * Integrates mandate validation, security checks, gateway adapter, and audit logging.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/database';
import { artifactSigner, AuthorizationArtifactContent } from '../crypto/artifact-signer';
import { securityGuardService } from '../services/security-guard.service';
import { auditLogService } from '../services/audit-log.service';
import { gatewayRouter } from '../services/gateway';

const ARTIFACT_VALIDITY_MINUTES = 15;

export class PaymentAuthController {
  /**
   * POST /api/v1/payments/authorize
   * Agent requests payment authorization.
   * 1. Validates mandate
   * 2. Runs all security checks
   * 3. Issues signed authorization artifact
   * 4. Submits to payment gateway
   * 5. Records everything in audit log
   */
  async requestAuthorization(req: Request, res: Response): Promise<void> {
    const {
      mandateId, agentId, amount, currency,
      idempotencyKey, callbackUrl, nonce, timestamp, signature, metadata,
    } = req.body;

    // Idempotency: check if artifact already exists for this key
    const existingArtifact = await query(
      `SELECT id, status, artifact_hash, server_signature FROM payment_authorization_artifacts WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    if (existingArtifact.rows.length > 0) {
      const existing = existingArtifact.rows[0];
      res.json({
        idempotent: true,
        artifactId: existing.id,
        status: existing.status,
        message: 'Duplicate request — returning existing artifact',
      });
      return;
    }

    // Load mandate with full details
    const mandateResult = await query(`SELECT * FROM mandates WHERE id = $1`, [mandateId]);
    if (mandateResult.rows.length === 0) {
      res.status(404).json({ error: 'Mandate not found' });
      return;
    }
    const m = mandateResult.rows[0];

    if (m.status !== 'active') {
      res.status(400).json({ error: `Mandate status is '${m.status}', must be 'active'` });
      return;
    }

    // Run all security checks
    const check = await securityGuardService.preExecutionCheck({
      nonce,
      agentId,
      mandateId,
      mandateAgentId: m.agent_id,
      mandateType: m.type,
      mandateStatus: m.status,
      requestedOperation: 'payment',
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
      res.status(403).json({
        authorized: false,
        violation: check.violation,
        error: check.error,
      });
      return;
    }

    // Create and sign the authorization artifact
    const artifactId = crypto.randomUUID();
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ARTIFACT_VALIDITY_MINUTES * 60 * 1000).toISOString();

    const artifactContent: AuthorizationArtifactContent = {
      artifactId,
      mandateId,
      userId: m.user_id,
      agentId,
      merchantId: m.merchant_id,
      amount,
      currency: currency || 'USD',
      idempotencyKey,
      issuedAt,
      expiresAt,
    };

    const signedArtifact = await artifactSigner.signArtifact(artifactContent);

    // Persist the artifact
    await query(
      `INSERT INTO payment_authorization_artifacts (
        id, mandate_id, user_id, agent_id, merchant_id,
        amount, currency, idempotency_key,
        artifact_hash, server_signature, signature_algorithm,
        status, expires_at, callback_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'issued', $12, $13)`,
      [
        artifactId, mandateId, m.user_id, agentId, m.merchant_id,
        amount, currency || 'USD', idempotencyKey,
        signedArtifact.artifactHash, signedArtifact.serverSignature,
        signedArtifact.signatureAlgorithm,
        expiresAt, callbackUrl || null,
      ],
    );

    // Submit to payment gateway
    const gateway = gatewayRouter.getDefault();
    const gatewayResult = await gateway.authorize({
      idempotencyKey,
      amount,
      currency: currency || 'USD',
      mandateId,
      merchantId: m.merchant_id,
      description: `Agentic payment - Mandate ${mandateId}`,
      metadata,
    });

    // Update artifact with gateway result
    if (gatewayResult.success) {
      await query(
        `UPDATE payment_authorization_artifacts
         SET status = 'submitted', gateway_provider = $1, gateway_tx_id = $2,
             gateway_response = $3, submitted_at = NOW()
         WHERE id = $4`,
        [gateway.providerName, gatewayResult.gatewayTxId, JSON.stringify(gatewayResult), artifactId],
      );

      // Update mandate usage counters
      await query(
        `UPDATE mandates SET
          amount_used = amount_used + $1,
          amount_used_today = amount_used_today + $1,
          amount_used_month = amount_used_month + $1,
          transactions_today = transactions_today + 1,
          updated_at = NOW()
        WHERE id = $2`,
        [amount, mandateId],
      );

      await auditLogService.logPaymentAuthorization(
        agentId, mandateId, artifactId, amount,
        `Payment of $${amount} authorized via ${gateway.providerName} (tx: ${gatewayResult.gatewayTxId})`,
      );
    } else {
      await query(
        `UPDATE payment_authorization_artifacts
         SET status = 'failed', gateway_provider = $1, gateway_response = $2,
             failed_at = NOW(), failure_reason = $3
         WHERE id = $4`,
        [gateway.providerName, JSON.stringify(gatewayResult), gatewayResult.declineReason || gatewayResult.message, artifactId],
      );

      await auditLogService.logPaymentResult(
        artifactId, mandateId, 'failed',
        `Payment of $${amount} declined: ${gatewayResult.declineReason || gatewayResult.message}`,
        { gatewayResult },
      );
    }

    res.status(gatewayResult.success ? 200 : 402).json({
      authorized: gatewayResult.success,
      artifact: {
        id: artifactId,
        mandateId,
        amount,
        currency: currency || 'USD',
        status: gatewayResult.success ? 'submitted' : 'failed',
        gatewayTxId: gatewayResult.gatewayTxId || null,
        artifactHash: signedArtifact.artifactHash,
        serverSignature: signedArtifact.serverSignature,
        issuedAt,
        expiresAt,
      },
      gateway: {
        provider: gateway.providerName,
        status: gatewayResult.status,
        message: gatewayResult.message || gatewayResult.declineReason,
      },
    });
  }

  /**
   * POST /api/v1/payments/callback
   * Gateway sends settlement/failure result.
   */
  async receiveCallback(req: Request, res: Response): Promise<void> {
    const { artifactId, gatewayTxId, status, gatewayResponse, failureReason } = req.body;

    const artifact = await query(
      `SELECT * FROM payment_authorization_artifacts WHERE id = $1`,
      [artifactId],
    );
    if (artifact.rows.length === 0) {
      res.status(404).json({ error: 'Artifact not found' });
      return;
    }

    const a = artifact.rows[0];
    const newStatus = status === 'settled' ? 'settled' : 'failed';

    const updateFields = status === 'settled'
      ? `status = 'settled', settled_at = NOW(), gateway_tx_id = $1, gateway_response = $2`
      : `status = 'failed', failed_at = NOW(), failure_reason = $1, gateway_response = $2`;

    await query(
      `UPDATE payment_authorization_artifacts SET ${updateFields}, callback_status = 'delivered', callback_attempts = callback_attempts + 1 WHERE id = $3`,
      status === 'settled'
        ? [gatewayTxId, JSON.stringify(gatewayResponse || {}), artifactId]
        : [failureReason, JSON.stringify(gatewayResponse || {}), artifactId],
    );

    // If payment failed after being submitted, roll back mandate usage
    if (newStatus === 'failed' && a.status === 'submitted') {
      await query(
        `UPDATE mandates SET
          amount_used = GREATEST(0, amount_used - $1),
          amount_used_today = GREATEST(0, amount_used_today - $1),
          amount_used_month = GREATEST(0, amount_used_month - $1),
          transactions_today = GREATEST(0, transactions_today - 1),
          updated_at = NOW()
        WHERE id = $2`,
        [parseFloat(a.amount), a.mandate_id],
      );
    }

    await auditLogService.logPaymentResult(
      artifactId, a.mandate_id, newStatus,
      `Payment ${newStatus}: artifact ${artifactId}, amount $${a.amount}`,
      { gatewayTxId, failureReason },
    );

    res.json({ message: `Callback processed: ${newStatus}`, artifactId });
  }

  /**
   * GET /api/v1/payments/artifact/:id
   * Retrieve a payment authorization artifact.
   */
  async getArtifact(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM payment_authorization_artifacts WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Artifact not found' });
      return;
    }

    const a = result.rows[0];
    res.json({
      artifact: {
        id: a.id,
        mandateId: a.mandate_id,
        userId: a.user_id,
        agentId: a.agent_id,
        merchantId: a.merchant_id,
        amount: parseFloat(a.amount),
        currency: a.currency,
        idempotencyKey: a.idempotency_key,
        artifactHash: a.artifact_hash,
        serverSignature: a.server_signature,
        status: a.status,
        gatewayProvider: a.gateway_provider,
        gatewayTxId: a.gateway_tx_id,
        issuedAt: a.issued_at,
        expiresAt: a.expires_at,
        settledAt: a.settled_at,
        failedAt: a.failed_at,
        failureReason: a.failure_reason,
      },
    });
  }
}

export const paymentAuthController = new PaymentAuthController();
