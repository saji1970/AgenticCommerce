import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AgenticCommerceController } from '../controllers/agentic-commerce.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  agentCartRequestSchema,
  createIntentRequestSchema,
  agentPaymentRequestSchema,
} from '@agentic-commerce/validation';

const router: RouterType = Router();
const acpController = new AgenticCommerceController();

// All ACP routes require authentication
router.use(authenticateToken);

// Cart Mandate Operations
router.post('/cart/add', validate(agentCartRequestSchema), acpController.agentAddToCart);

// Intent Mandate Operations
router.post('/intents', validate(createIntentRequestSchema), acpController.createIntent);
router.get('/intents', acpController.getUserIntents);
router.post('/intents/:intentId/approve', acpController.approveIntent);
router.post('/intents/:intentId/reject', acpController.rejectIntent);

// Payment Mandate Operations
router.post('/payment/execute', validate(agentPaymentRequestSchema), acpController.agentExecutePayment);

// Agent Actions (Audit Log)
router.get('/actions', acpController.getAgentActions);

export default router;
