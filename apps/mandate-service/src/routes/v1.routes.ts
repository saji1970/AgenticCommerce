/**
 * V1 API Routes
 * All mandate server endpoints under /api/v1
 */

import { Router } from 'express';
import { authenticateAny, authenticateJWT, authenticateMerchantApiKey, requireCallerType } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  CreateMerchantSchema, VerifyMerchantSchema, UpdateMerchantSettingsSchema,
} from '../schemas/merchant.schema';
import {
  RegisterAgentSchema, RotateAgentKeySchema, SuspendAgentSchema, RevokeAgentSchema,
} from '../schemas/agent.schema';
import {
  CreateMandateDraftSchema, SubmitSignedMandateSchema,
  ActivateMandateSchema, RevokeMandateSchema, ValidateMandateForExecutionSchema,
} from '../schemas/mandate.schema';
import {
  RequestPaymentAuthorizationSchema, PaymentResultCallbackSchema,
} from '../schemas/payment-authorization.schema';
import { RegisterPublicKeySchema } from '../schemas/signature.schema';

import { merchantApiController } from '../controllers/merchant-api.controller';
import { agentApiController } from '../controllers/agent-api.controller';
import { mandateApiController } from '../controllers/mandate-api.controller';
import { paymentAuthController } from '../controllers/payment-auth.controller';
import { auditLogService } from '../services/audit-log.service';
import { query } from '../config/database';

const router = Router();

// ============================================================================
// Merchant Endpoints
// ============================================================================
router.post('/merchants/register',
  validate(CreateMerchantSchema),
  (req, res) => merchantApiController.register(req, res),
);

router.post('/merchants/:id/verify',
  authenticateAny, requireCallerType('system'),
  (req, res) => merchantApiController.verify(req, res),
);

router.get('/merchants',
  authenticateAny,
  (req, res) => merchantApiController.list(req, res),
);

router.put('/merchants/:id/settings',
  authenticateAny, requireCallerType('merchant', 'system'),
  validate(UpdateMerchantSettingsSchema),
  (req, res) => merchantApiController.updateSettings(req, res),
);

router.post('/merchants/:id/rotate-keys',
  authenticateAny, requireCallerType('merchant', 'system'),
  (req, res) => merchantApiController.rotateKeys(req, res),
);

// ============================================================================
// Agent Endpoints
// ============================================================================
router.post('/agents/register',
  authenticateAny, requireCallerType('merchant', 'system'),
  validate(RegisterAgentSchema),
  (req, res) => agentApiController.register(req, res),
);

router.get('/agents/:agentId',
  authenticateAny,
  (req, res) => agentApiController.getById(req, res),
);

router.post('/agents/:agentId/rotate-keys',
  authenticateAny, requireCallerType('merchant', 'system'),
  (req, res) => agentApiController.rotateKeys(req, res),
);

router.post('/agents/:agentId/suspend',
  authenticateAny, requireCallerType('merchant', 'system'),
  (req, res) => agentApiController.suspend(req, res),
);

router.post('/agents/:agentId/revoke',
  authenticateAny, requireCallerType('merchant', 'system'),
  (req, res) => agentApiController.revoke(req, res),
);

// ============================================================================
// Mandate Endpoints
// ============================================================================
router.post('/mandates/draft',
  authenticateAny,
  validate(CreateMandateDraftSchema),
  (req, res) => mandateApiController.createDraft(req, res),
);

router.post('/mandates/submit-signed',
  authenticateJWT, requireCallerType('user'),
  validate(SubmitSignedMandateSchema),
  (req, res) => mandateApiController.submitSigned(req, res),
);

router.post('/mandates/:id/activate',
  authenticateAny,
  (req, res) => mandateApiController.activate(req, res),
);

router.post('/mandates/:id/revoke',
  authenticateAny,
  (req, res) => mandateApiController.revoke(req, res),
);

router.get('/mandates/:id',
  authenticateAny,
  (req, res) => mandateApiController.getStatus(req, res),
);

router.get('/mandates/user/:userId',
  authenticateAny,
  (req, res) => mandateApiController.getUserMandates(req, res),
);

router.post('/mandates/validate',
  authenticateAny,
  validate(ValidateMandateForExecutionSchema),
  (req, res) => mandateApiController.validateForExecution(req, res),
);

// ============================================================================
// Payment Authorization Endpoints
// ============================================================================
router.post('/payments/authorize',
  authenticateAny,
  validate(RequestPaymentAuthorizationSchema),
  (req, res) => paymentAuthController.requestAuthorization(req, res),
);

router.post('/payments/callback',
  (req, res) => paymentAuthController.receiveCallback(req, res),
);

router.get('/payments/artifact/:id',
  authenticateAny,
  (req, res) => paymentAuthController.getArtifact(req, res),
);

// ============================================================================
// User Public Key Registration
// ============================================================================
router.post('/keys/register',
  authenticateJWT, requireCallerType('user'),
  validate(RegisterPublicKeySchema),
  async (req, res) => {
    const { userId, publicKeyPem, keyAlgorithm, deviceId, attestationData } = req.body;
    const crypto = await import('crypto');
    const keyId = crypto.createHash('sha256').update(publicKeyPem).digest('hex').substring(0, 32);

    await query(
      `INSERT INTO user_public_keys (user_id, public_key_pem, key_algorithm, key_id, device_id, attestation_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key_id) DO UPDATE SET updated_at = NOW()
       RETURNING key_id`,
      [userId, publicKeyPem, keyAlgorithm || 'Ed25519', keyId, deviceId || null, attestationData ? JSON.stringify(attestationData) : null],
    );

    res.status(201).json({ keyId, message: 'Public key registered' });
  },
);

// ============================================================================
// Audit Log Endpoints (system/admin only)
// ============================================================================
router.get('/audit/mandate/:mandateId',
  authenticateAny,
  async (req, res) => {
    const entries = await auditLogService.getByMandateId(req.params.mandateId);
    res.json({ entries });
  },
);

router.get('/audit/security',
  authenticateAny, requireCallerType('system'),
  async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const entries = await auditLogService.getSecurityEvents(limit);
    res.json({ entries });
  },
);

router.get('/audit/integrity',
  authenticateAny, requireCallerType('system'),
  async (req, res) => {
    const result = await auditLogService.verifyChainIntegrity();
    res.json(result);
  },
);

export default router;
