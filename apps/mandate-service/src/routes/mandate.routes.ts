import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { MandateController } from '../controllers/mandate.controller';

const router: RouterType = Router();
const mandateController = new MandateController();

// Register mandate (called by agents)
router.post('/register', mandateController.registerMandate);

// Validate mandate (called by agents before transactions)
router.post('/validate', mandateController.validateMandate);

// Validate mandate token (called by backend during checkout)
router.post('/validate-token', mandateController.validateMandateToken);

// Complete mandates after payment (called by backend after successful payment)
router.post('/complete', mandateController.completeMandatesAfterPayment);

// Get user app mandates
router.get('/app', mandateController.getUserAppMandates);

// Get app mandate children
router.get('/app/:id/children', mandateController.getAppMandateChildren);

// Get user mandates
router.get('/', mandateController.getUserMandates);

// Get specific mandate
router.get('/:id', mandateController.getMandate);

// Approve mandate (requires userId in body)
router.post('/:id/approve', mandateController.approveMandate);

// Suspend mandate (requires userId in body)
router.post('/:id/suspend', mandateController.suspendMandate);

// Revoke mandate (requires userId in body)
router.post('/:id/revoke', mandateController.revokeMandate);

export default router;
