import { Router } from 'express';
import { MandateController } from '../controllers/mandate.controller';
import { authenticate } from '../middleware/auth';

export function createMandateRoutes(mandateController: MandateController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  // Intent Mandate routes
  router.post('/intent', mandateController.createIntentMandate);
  router.get('/intent/:mandateId', mandateController.getIntentMandate);

  // Cart Mandate routes
  router.post('/cart', mandateController.createCartMandate);

  // Payment processing
  router.post('/process-payment', mandateController.processPayment);

  // User mandates
  router.get('/user', mandateController.getUserMandates);

  // Mandate management
  router.post('/:mandateId/revoke', mandateController.revokeMandate);
  router.get('/:mandateId/audit', mandateController.getAuditTrail);

  return router;
}
