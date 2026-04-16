import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { authenticateTokenOrMcpConnectingKey } from '../middleware/authenticate-token-or-mcp-connecting-key.middleware';
import { McpProxyController } from '../controllers/mcp-proxy.controller';

const router: RouterType = Router();
const ctrl = new McpProxyController();

router.use(authenticateTokenOrMcpConnectingKey);

router.post('/evaluate-payment-options', ctrl.evaluatePaymentOptions);

export default router;
