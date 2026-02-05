/**
 * AI Agent API Controller
 * Endpoints: register, rotate keys, suspend, revoke.
 * All endpoints authenticate, enforce capabilities, and log audit entries.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/database';
import { keyManager } from '../crypto/key-manager';
import { auditLogService } from '../services/audit-log.service';

export class AgentApiController {
  /**
   * POST /api/v1/agents/register
   * Merchant registers an AI agent.
   */
  async register(req: Request, res: Response): Promise<void> {
    const {
      merchantId, name, slug, description, agentName,
      publicKeyPem, keyAlgorithm, apiEndpoint, capabilities,
    } = req.body;

    // Verify merchant exists and is active
    const merchant = await query(`SELECT id, status FROM merchants WHERE id = $1`, [merchantId]);
    if (merchant.rows.length === 0) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }
    if (merchant.rows[0].status !== 'active') {
      res.status(403).json({ error: 'Merchant must be active to register agents' });
      return;
    }

    // Validate public key
    const validKey = keyManager.validatePublicKey(publicKeyPem, keyAlgorithm || 'Ed25519');
    if (!validKey) {
      res.status(400).json({ error: 'Invalid public key for specified algorithm' });
      return;
    }

    // Check slug uniqueness
    const existingSlug = await query(`SELECT id FROM ai_agent_apps WHERE slug = $1`, [slug]);
    if (existingSlug.rows.length > 0) {
      res.status(409).json({ error: 'Agent slug already exists' });
      return;
    }

    const agentId = `agent_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

    const result = await query(
      `INSERT INTO ai_agent_apps (merchant_id, name, slug, description, agent_id, agent_name, public_key_pem, key_algorithm, api_endpoint, capabilities, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
       RETURNING id, agent_id, name, slug, status, created_at`,
      [merchantId, name, slug, description, agentId, agentName, publicKeyPem, keyAlgorithm || 'Ed25519', apiEndpoint, JSON.stringify(capabilities)],
    );

    const agent = result.rows[0];

    await auditLogService.log({
      actorType: 'merchant',
      actorId: merchantId,
      eventType: 'agent.registered',
      eventCategory: 'agent',
      severity: 'info',
      description: `Agent '${name}' registered by merchant ${merchantId}`,
      newState: { agentId, name, capabilities },
      ipAddress: req.ip,
    });

    res.status(201).json({
      agent: {
        id: agent.id,
        agentId: agent.agent_id,
        name: agent.name,
        slug: agent.slug,
        status: agent.status,
        keyFingerprint: keyManager.computeFingerprint(publicKeyPem),
      },
    });
  }

  /**
   * POST /api/v1/agents/:agentId/rotate-keys
   * Rotate an agent's signing key pair.
   */
  async rotateKeys(req: Request, res: Response): Promise<void> {
    const { agentId } = req.params;
    const { newPublicKeyPem, keyAlgorithm } = req.body;

    const agent = await query(
      `SELECT id, public_key_pem, key_algorithm, previous_keys FROM ai_agent_apps WHERE agent_id = $1`,
      [agentId],
    );
    if (agent.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const validKey = keyManager.validatePublicKey(newPublicKeyPem, keyAlgorithm || 'Ed25519');
    if (!validKey) {
      res.status(400).json({ error: 'Invalid public key' });
      return;
    }

    // Archive old key
    const row = agent.rows[0];
    const previousKeys = (typeof row.previous_keys === 'string' ? JSON.parse(row.previous_keys) : row.previous_keys) || [];
    if (row.public_key_pem) {
      previousKeys.push({
        publicKeyPem: row.public_key_pem,
        algorithm: row.key_algorithm,
        retiredAt: new Date().toISOString(),
      });
    }

    await query(
      `UPDATE ai_agent_apps SET public_key_pem = $1, key_algorithm = $2, key_rotated_at = NOW(), previous_keys = $3, updated_at = NOW() WHERE agent_id = $4`,
      [newPublicKeyPem, keyAlgorithm || 'Ed25519', JSON.stringify(previousKeys), agentId],
    );

    await auditLogService.log({
      actorType: req.caller?.type || 'merchant',
      actorId: req.caller?.id || 'unknown',
      eventType: 'agent.key_rotated',
      eventCategory: 'agent',
      severity: 'warning',
      resourceType: 'agent',
      resourceId: agentId,
      description: `Signing key rotated for agent '${agentId}'`,
      metadata: { newFingerprint: keyManager.computeFingerprint(newPublicKeyPem) },
    });

    res.json({
      message: 'Agent key rotated',
      newKeyFingerprint: keyManager.computeFingerprint(newPublicKeyPem),
    });
  }

  /**
   * POST /api/v1/agents/:agentId/suspend
   */
  async suspend(req: Request, res: Response): Promise<void> {
    const { agentId } = req.params;
    const { reason } = req.body;

    const agent = await query(`SELECT id, status, name FROM ai_agent_apps WHERE agent_id = $1`, [agentId]);
    if (agent.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (agent.rows[0].status === 'revoked') {
      res.status(400).json({ error: 'Cannot suspend a revoked agent' });
      return;
    }

    await query(
      `UPDATE ai_agent_apps SET status = 'suspended', suspended_at = NOW(), suspended_reason = $1, updated_at = NOW() WHERE agent_id = $2`,
      [reason, agentId],
    );

    await auditLogService.log({
      actorType: req.caller?.type || 'system',
      actorId: req.caller?.id || 'system',
      eventType: 'agent.suspended',
      eventCategory: 'agent',
      severity: 'warning',
      resourceType: 'agent',
      resourceId: agentId,
      description: `Agent '${agent.rows[0].name}' suspended: ${reason}`,
      oldState: { status: agent.rows[0].status },
      newState: { status: 'suspended' },
    });

    res.json({ message: 'Agent suspended', agentId });
  }

  /**
   * POST /api/v1/agents/:agentId/revoke
   * Permanent revocation — cannot be undone.
   */
  async revoke(req: Request, res: Response): Promise<void> {
    const { agentId } = req.params;
    const { reason } = req.body;

    const agent = await query(`SELECT id, status, name FROM ai_agent_apps WHERE agent_id = $1`, [agentId]);
    if (agent.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (agent.rows[0].status === 'revoked') {
      res.status(400).json({ error: 'Agent already revoked' });
      return;
    }

    await query(
      `UPDATE ai_agent_apps SET status = 'revoked', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW() WHERE agent_id = $2`,
      [reason, agentId],
    );

    // Also revoke all active mandates for this agent
    await query(
      `UPDATE mandates SET status = 'revoked', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW()
       WHERE agent_id = $2 AND status IN ('draft', 'awaiting_consent', 'active')`,
      [`Agent revoked: ${reason}`, agentId],
    );

    await auditLogService.log({
      actorType: req.caller?.type || 'system',
      actorId: req.caller?.id || 'system',
      eventType: 'agent.revoked',
      eventCategory: 'agent',
      severity: 'critical',
      resourceType: 'agent',
      resourceId: agentId,
      description: `Agent '${agent.rows[0].name}' permanently revoked: ${reason}. All mandates revoked.`,
      oldState: { status: agent.rows[0].status },
      newState: { status: 'revoked' },
    });

    res.json({ message: 'Agent permanently revoked and all mandates cancelled', agentId });
  }

  /**
   * GET /api/v1/agents/:agentId
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { agentId } = req.params;
    const result = await query(
      `SELECT id, agent_id, name, slug, description, agent_name, key_algorithm, capabilities, status, created_at, updated_at
       FROM ai_agent_apps WHERE agent_id = $1`,
      [agentId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      agent: {
        id: row.id,
        agentId: row.agent_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        agentName: row.agent_name,
        keyAlgorithm: row.key_algorithm,
        capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  }
}

export const agentApiController = new AgentApiController();
