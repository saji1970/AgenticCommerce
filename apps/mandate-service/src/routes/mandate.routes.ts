import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { MandateController } from '../controllers/mandate.controller';
import { CheckoutMandateController } from '../controllers/checkout-mandate.controller';

const router: RouterType = Router();
const mandateController = new MandateController();
const checkoutController = new CheckoutMandateController();

// Register mandate (called by agents)
router.post('/register', mandateController.registerMandate);

// Validate mandate (called by agents before transactions)
router.post('/validate', mandateController.validateMandate);

// Validate mandate token (called by backend during checkout)
router.post('/validate-token', mandateController.validateMandateToken);

// Card-on-File: Register mandate with CIT authorization
router.post('/register-cof', mandateController.registerMandateWithCIT);

// Card-on-File: Process agent payment via MIT
router.post('/agent-payment', mandateController.processAgentPayment);

// Checkout mandate routes (must come before /:id)
router.post('/checkout', checkoutController.createCheckoutMandate);
router.get('/checkout/user/:userId', checkoutController.getUserCheckoutMandates);
router.post('/checkout/:id/approve', checkoutController.approveCheckoutMandate);
router.post('/checkout/:id/revoke', checkoutController.revokeCheckoutMandate);
router.get('/checkout/:id/usage', checkoutController.getUsage);
router.get('/checkout/:id/transactions', checkoutController.getTransactions);
router.post('/checkout/execute-with-token', checkoutController.executePaymentWithToken);
router.post('/checkout/validate-token', checkoutController.validateConsentToken);

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

// Update mandate constraints (requires userId in body for ownership check)
router.put('/:id/constraints', mandateController.updateConstraints);

// Revoke mandate (requires userId in body)
router.post('/:id/revoke', mandateController.revokeMandate);

export default router;
