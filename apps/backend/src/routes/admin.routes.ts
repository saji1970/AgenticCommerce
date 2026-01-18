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

// Users
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);

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

// AP2 Transactions
router.get('/ap2/transactions', adminController.getAllAP2Transactions);

// Seed Demo Data
router.post('/seed-demo', adminController.seedDemoData);

export default router;
