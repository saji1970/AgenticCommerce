import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { McpProxyController } from '../controllers/mcp-proxy.controller';

const router: RouterType = Router();
const ctrl = new McpProxyController();

router.use(authenticateToken);

router.post('/evaluate-payment-options', ctrl.evaluatePaymentOptions);

export default router;
