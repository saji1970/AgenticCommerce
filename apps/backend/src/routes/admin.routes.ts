import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router: RouterType = Router();
const adminController = new AdminController();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/alerts', adminController.getDashboardAlerts);

// Merchants
router.get('/merchants', adminController.getAllMerchants);
router.get('/merchants/:id', adminController.getMerchantById);
router.post('/merchants', adminController.createMerchant);
router.put('/merchants/:id', adminController.updateMerchant);
router.put('/merchants/:id/status', adminController.updateMerchantStatus);
router.delete('/merchants/:id', adminController.deleteMerchant);
router.post('/merchants/:id/rotate-keys', adminController.rotateMerchantKeys);

// Merchant-Agent Association
router.get('/merchants/:id/agents', adminController.getMerchantAgents);
router.post('/merchants/:id/agents', adminController.addMerchantAgent);
router.put('/merchants/:id/agents/:agentId', adminController.updateMerchantAgentConfig);
router.delete('/merchants/:id/agents/:agentId', adminController.removeMerchantAgent);

// Users
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.get('/users/:userId/settings', adminController.getUserSettings);
router.put('/users/:userId/settings', adminController.updateUserSettings);
router.put('/users/:userId/block', adminController.blockUser);
router.put('/users/:userId/unblock', adminController.unblockUser);

// Mandates
router.get('/mandates', adminController.getAllMandates);

// Intents
router.get('/intents', adminController.getAllIntents);

// Agent Actions
router.get('/actions', adminController.getAllActions);

// AI Agents
router.get('/agents', adminController.getAllAgents);
router.get('/agents/:agentId/monitoring', adminController.getAgentMonitoring);
router.get('/agents/:agentId/auditability', adminController.getAgentAuditability);
router.get('/agents/:agentId/transactions', adminController.getAgentTransactionHistory);
router.get('/agents/:agentId/certificates', adminController.getAgentCertificates);
router.post('/agents/:agentId/certificates', adminController.uploadAgentCertificate);

// Certificates
router.get('/certificates', adminController.getAllCertificates);
router.get('/certificates/expiring', adminController.getExpiringCertificates);
router.post('/certificates/:id/revoke', adminController.revokeCertificate);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Admin Settings
router.get('/settings', adminController.getSettings);
router.get('/settings/:category', adminController.getSettingsByCategory);
router.put('/settings', adminController.updateSettings);

// AP2 Transactions
router.get('/ap2/transactions', adminController.getAllAP2Transactions);
router.get('/ap2/transactions/:id', adminController.getAP2TransactionById);

// Seed Demo Data
router.post('/seed-demo', adminController.seedDemoData);

export default router;
