import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { paymentRequestSchema } from '@agentic-commerce/validation';

const router: RouterType = Router();
const paymentController = new PaymentController();

// All payment routes require authentication
router.use(authenticateToken);

// Process payment
router.post('/', validate(paymentRequestSchema), paymentController.processPayment);

// Get order history
router.get('/orders', paymentController.getOrderHistory);

// Get specific order
router.get('/orders/:orderId', paymentController.getOrderById);

export default router;
