/**
 * Admin API Routes
 * All endpoints under /api/v1/admin
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/env';
import { authenticateAdmin, requireAdminRole } from '../middleware/admin-auth';
import { validate } from '../middleware/validate';
import { LoginSchema, CreateAdminUserSchema, UpdateAdminUserSchema } from '../schemas/admin-user.schema';
import { adminAuthController } from '../controllers/admin-auth.controller';
import { adminUserController } from '../controllers/admin-user.controller';
import { adminDashboardController } from '../controllers/admin-dashboard.controller';
import { adminMerchantController } from '../controllers/admin-merchant.controller';
import { adminMandateController } from '../controllers/admin-mandate.controller';
import { adminTransactionController } from '../controllers/admin-transaction.controller';
import { adminDisputeController } from '../controllers/admin-dispute.controller';

const router = Router();

// ============================================================================
// Auth (no auth middleware needed for login)
// ============================================================================
router.post('/auth/login', validate(LoginSchema), adminAuthController.login);
router.get('/auth/me', authenticateAdmin, adminAuthController.me);

// ============================================================================
// Admin Users
// ============================================================================
router.post('/users',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  validate(CreateAdminUserSchema),
  adminUserController.create,
);

router.get('/users',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminUserController.list,
);

router.get('/users/:id',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminUserController.getById,
);

router.put('/users/:id',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  validate(UpdateAdminUserSchema),
  adminUserController.update,
);

router.put('/users/:id/deactivate',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminUserController.deactivate,
);

// ============================================================================
// Dashboard
// ============================================================================
router.get('/dashboard/stats',
  authenticateAdmin,
  adminDashboardController.getStats,
);

// ============================================================================
// Merchants
// ============================================================================
router.get('/merchants',
  authenticateAdmin,
  adminMerchantController.list,
);

router.get('/merchants/:id',
  authenticateAdmin,
  adminMerchantController.getById,
);

router.post('/merchants',
  authenticateAdmin,
  requireAdminRole('super_admin'),
  adminMerchantController.create,
);

router.put('/merchants/:id',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMerchantController.update,
);

router.put('/merchants/:id/status',
  authenticateAdmin,
  requireAdminRole('super_admin'),
  adminMerchantController.updateStatus,
);

router.get('/merchants/:merchantId/agents',
  authenticateAdmin,
  adminMerchantController.listAgents,
);

router.post('/merchants/:merchantId/agents',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMerchantController.registerAgent,
);

router.get('/merchants/:merchantId/agents/:agentId',
  authenticateAdmin,
  adminMerchantController.getAgent,
);

router.put('/merchants/:merchantId/agents/:agentId',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMerchantController.updateAgent,
);

router.delete('/merchants/:merchantId/agents/:agentId',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMerchantController.deleteAgent,
);

router.post('/merchants/:merchantId/agents/:agentId/rotate-app-token',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMerchantController.rotateAgentAppToken,
);

router.post('/merchants/:merchantId/rotate-keys',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMerchantController.rotateKeys,
);

// ============================================================================
// Mandates (admin view)
// ============================================================================
router.get('/mandates',
  authenticateAdmin,
  adminMandateController.list,
);

router.get('/mandates/:id/detail',
  authenticateAdmin,
  adminMandateController.getDetail,
);

router.get('/mandates/:id',
  authenticateAdmin,
  adminMandateController.getById,
);

router.put('/mandates/:id/revoke',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMandateController.revoke,
);

router.put('/mandates/:id/suspend',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMandateController.suspend,
);

router.put('/mandates/:id/reactivate',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMandateController.reactivate,
);

router.put('/mandates/:id/constraints',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminMandateController.updateConstraints,
);

// ============================================================================
// Transactions (admin view)
// ============================================================================
router.get('/transactions',
  authenticateAdmin,
  adminTransactionController.list,
);

router.post('/transactions/seed-test',
  authenticateAdmin,
  adminTransactionController.seedTest,
);

router.get('/transactions/:id/detail',
  authenticateAdmin,
  adminTransactionController.getDetail,
);

router.get('/transactions/:id',
  authenticateAdmin,
  adminTransactionController.getById,
);

// ============================================================================
// Audit Logs (super_admin only)
// ============================================================================
router.get('/audit-logs/by-agent/:agentId',
  authenticateAdmin,
  async (req, res) => {
    try {
      const { auditLogService } = await import('../services/audit-log.service');
      const { agentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const entries = await auditLogService.getByActor('agent', agentId, limit);
      // Apply offset manually since getByActor doesn't support it
      const sliced = entries.slice(offset, offset + limit);
      res.json({
        success: true,
        data: sliced,
        pagination: { total: entries.length, limit, offset },
      });
    } catch {
      res.json({ success: true, data: [], pagination: { total: 0, limit: 100, offset: 0 } });
    }
  },
);

router.get('/audit-logs',
  authenticateAdmin,
  requireAdminRole('super_admin'),
  async (req, res) => {
    try {
      const { auditLogService } = await import('../services/audit-log.service');
      const limit = parseInt(req.query.limit as string) || 100;
      const entries = await auditLogService.getSecurityEvents(limit);
      res.json({ success: true, data: entries });
    } catch {
      // Audit log table may not exist
      res.json({ success: true, data: [] });
    }
  },
);

// ============================================================================
// VRP Consents & Transactions - serve from mandate-service checkout mandates
// ============================================================================
import { MandateRepository } from '../repositories/mandate.repository';
import { TransactionRepository } from '../repositories/transaction.repository';

const vrpMandateRepo = new MandateRepository();
const vrpTxRepo = new TransactionRepository();

// GET /vrp-consents - list all checkout mandates as VRP consents
router.get('/vrp-consents', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, agentId, limit = '100', offset = '0' } = req.query;

    // Query all checkout mandates (type=payment with checkoutMandate flag)
    const result = await vrpMandateRepo.getAllMandates(
      status as string | undefined,
      'payment',
      parseInt(limit as string, 10),
      agentId as string | undefined,
      parseInt(offset as string, 10),
    );

    // Filter to only checkout mandates and map to VRP consent shape
    const consents = result.mandates
      .filter(m => m.constraints?.checkoutMandate === true)
      .map(m => ({
        id: m.id,
        userId: m.userId,
        agentId: m.agentId,
        agentName: m.agentName,
        status: m.status,
        maxAmountPerPayment: m.constraints?.maxAmountPerPayment ?? m.constraints?.maxTransactionAmount ?? 0,
        dailyLimit: m.constraints?.dailyLimit ?? m.dailyLimit ?? null,
        monthlyLimit: m.constraints?.monthlyLimit ?? m.periodLimit ?? null,
        appMandateId: m.parentMandateId || null,
        amountUsedToday: m.amountUsedToday ?? 0,
        amountUsedMonth: m.amountUsedPeriod ?? 0,
        transactionsToday: m.transactionsToday ?? 0,
        networkToken: m.networkToken || null,
        citTransactionId: m.citTransactionId || null,
        paymentMethods: m.paymentMethods || [],
        constraints: m.constraints || {},
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        validUntil: m.validUntil || null,
      }));

    res.json({ success: true, data: consents, total: consents.length });
  } catch (err: any) {
    console.error('[Admin VRP] Error loading consents:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /vrp-consents/:id - get single VRP consent detail
router.get('/vrp-consents/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const mandate = await vrpMandateRepo.getById(req.params.id);
    if (!mandate) {
      return res.status(404).json({ success: false, error: 'VRP consent not found' });
    }

    const transactions = await vrpTxRepo.getByMandateId(mandate.id);

    res.json({
      success: true,
      data: {
        id: mandate.id,
        userId: mandate.userId,
        agentId: mandate.agentId,
        agentName: mandate.agentName,
        status: mandate.status,
        maxAmountPerPayment: mandate.constraints?.maxAmountPerPayment ?? mandate.constraints?.maxTransactionAmount ?? 0,
        dailyLimit: mandate.constraints?.dailyLimit ?? mandate.dailyLimit ?? null,
        monthlyLimit: mandate.constraints?.monthlyLimit ?? mandate.periodLimit ?? null,
        appMandateId: mandate.parentMandateId || null,
        amountUsedToday: mandate.amountUsedToday ?? 0,
        amountUsedMonth: mandate.amountUsedPeriod ?? 0,
        transactionsToday: mandate.transactionsToday ?? 0,
        networkToken: mandate.networkToken || null,
        citTransactionId: mandate.citTransactionId || null,
        paymentMethods: mandate.paymentMethods || [],
        constraints: mandate.constraints || {},
        createdAt: mandate.createdAt,
        updatedAt: mandate.updatedAt,
        validUntil: mandate.validUntil || null,
        transactions,
      },
    });
  } catch (err: any) {
    console.error('[Admin VRP] Error loading consent detail:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /vrp-consents/:id/suspend - suspend a VRP consent
router.post('/vrp-consents/:id/suspend', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const updated = await vrpMandateRepo.updateStatus(req.params.id, 'suspended');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /vrp-consents/:id/revoke - revoke a VRP consent
router.post('/vrp-consents/:id/revoke', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body || {};
    const updated = await vrpMandateRepo.updateStatus(req.params.id, 'revoked', reason || 'Revoked by admin');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// VRP Transactions (with exceptional transaction filter)
// ============================================================================

// GET /vrp-transactions - list all VRP/checkout transactions with filters
router.get('/vrp-transactions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, agentId, merchantId, userId, mandateId, isExceptional, limit = '20', offset = '0' } = req.query;

    const filters: Record<string, any> = {};
    if (status) filters.status = status as string;
    if (agentId) filters.agentId = agentId as string;
    if (merchantId) filters.merchantId = merchantId as string;
    if (userId) filters.userId = userId as string;
    if (mandateId) filters.mandateId = mandateId as string;
    if (isExceptional === 'true') filters.isExceptional = true;
    if (isExceptional === 'false') filters.isExceptional = false;

    const result = await vrpTxRepo.getAll(
      filters,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10),
    );

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (err: any) {
    console.error('[Admin VRP Transactions] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// Disputes & Chargebacks
// ============================================================================
router.get('/disputes', authenticateAdmin, adminDisputeController.list);
router.post('/disputes',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminDisputeController.create,
);
router.get('/disputes/:id', authenticateAdmin, adminDisputeController.getById);
router.put('/disputes/:id',
  authenticateAdmin,
  requireAdminRole('super_admin', 'merchant_admin'),
  adminDisputeController.update,
);
router.post('/disputes/:id/assemble-evidence',
  authenticateAdmin,
  adminDisputeController.assembleEvidence,
);
router.get('/disputes/:id/export-csv',
  authenticateAdmin,
  adminDisputeController.exportCSV,
);
router.post('/disputes/:id/push-bau',
  authenticateAdmin,
  requireAdminRole('super_admin'),
  adminDisputeController.pushToBAU,
);

export default router;
