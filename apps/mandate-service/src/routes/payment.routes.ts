import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router: RouterType = Router();
const paymentController = new PaymentController();

// Process payment (validates mandate first, then processes through gateway)
router.post('/process', paymentController.processPayment);

export default router;
