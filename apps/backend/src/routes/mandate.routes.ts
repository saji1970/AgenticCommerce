import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { MandateController } from '../controllers/mandate.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createMandateSchema, updateMandateSchema } from '@agentic-commerce/validation';

const router: RouterType = Router();
const mandateController = new MandateController();

// All mandate routes require authentication
router.use(authenticateToken);

// Create mandate
router.post('/', validate(createMandateSchema), mandateController.createMandate);

// Get user's mandates
router.get('/', mandateController.getUserMandates);

// Get specific mandate
router.get('/:mandateId', mandateController.getMandate);

// Approve mandate
router.post('/:mandateId/approve', mandateController.approveMandate);

// Suspend mandate
router.post('/:mandateId/suspend', mandateController.suspendMandate);

// Revoke mandate
router.post('/:mandateId/revoke', mandateController.revokeMandate);

export default router;
