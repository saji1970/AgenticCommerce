import { Router } from 'express';
import { cofPaymentController } from '../controllers/cof-payment.controller';
import { authenticateAny } from '../middleware/auth';

const router = Router();

// CIT: Customer-Initiated Transaction — authorize card + provision network token
router.post('/cit', authenticateAny, cofPaymentController.processCIT);

// MIT: Merchant-Initiated Transaction — authorize using stored network token
router.post('/mit', authenticateAny, cofPaymentController.processMIT);

export default router;
