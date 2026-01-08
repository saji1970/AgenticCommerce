import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { MerchantController } from '../controllers/merchant.controller';
import { authenticateAP2ApiKey } from '../middleware/ap2-auth.middleware';

const router: RouterType = Router();
const merchantController = new MerchantController();

// Public routes
router.post('/register', merchantController.registerMerchant);

// Protected routes (require API key authentication)
router.use(authenticateAP2ApiKey);

router.get('/:merchantId', merchantController.getMerchant);
router.put('/:merchantId/status', merchantController.updateMerchantStatus);
router.put('/:merchantId/settings', merchantController.updateMerchantSettings);
router.put('/:merchantId/webhook', merchantController.updateWebhook);
router.post('/:merchantId/rotate-keys', merchantController.rotateApiKeys);

// Analytics and reporting
router.get('/:merchantId/transactions', merchantController.getTransactions);
router.get('/:merchantId/analytics', merchantController.getAnalytics);
router.get('/:merchantId/webhooks', merchantController.getWebhookLogs);

export default router;
