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
// VRP Consents & Transactions - proxy to payment gateway admin API
// ============================================================================
const PAYMENT_GATEWAY_URL = config.paymentGateway.url.replace(/\/$/, '');

router.all('/vrp-consents*', authenticateAdmin, vrpAdminProxy);
router.all('/vrp-transactions*', authenticateAdmin, vrpAdminProxy);

async function vrpAdminProxy(req: Request, res: Response) {
  const path = req.path;
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const targetUrl = `${PAYMENT_GATEWAY_URL}/api/admin${path}${qs}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers,
      validateStatus: () => true,
      timeout: 15000,
    });

    res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('[Admin VRP Proxy] Error forwarding to payment gateway:', err.message);
    res.status(502).json({
      success: false,
      error: err.response?.data?.error || 'Payment gateway unavailable',
    });
  }
}

export default router;
