import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AP2GatewayController } from '../controllers/ap2-gateway.controller';
import { authenticateAP2, authenticateAP2ApiKey } from '../middleware/ap2-auth.middleware';

const router: RouterType = Router();
const gatewayController = new AP2GatewayController();

// Public routes
router.get('/docs', gatewayController.getApiDocs);
router.get('/health', gatewayController.healthCheck);

// Protected routes (require API key + signature)
router.use(authenticateAP2);

// Authorization and verification
router.post('/authorize', gatewayController.authorizeTransaction);
router.post('/verify-mandate', gatewayController.verifyMandate);

// Operations
router.post('/cart', gatewayController.processCartOperation);
router.post('/intent', gatewayController.processIntentOperation);
router.post('/payment', gatewayController.processPaymentOperation);

export default router;
