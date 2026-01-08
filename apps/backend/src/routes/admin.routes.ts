import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: RouterType = Router();
const adminController = new AdminController();

// All admin routes require authentication
// In production, you would add an admin role check here
router.use(authenticateToken);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Mandates
router.get('/mandates', adminController.getAllMandates);

// Intents
router.get('/intents', adminController.getAllIntents);

// Agent Actions
router.get('/actions', adminController.getAllActions);

// Users
router.get('/users/:userId', adminController.getUserDetails);

// AP2 Transactions
router.get('/ap2/transactions', adminController.getAllAP2Transactions);

export default router;
