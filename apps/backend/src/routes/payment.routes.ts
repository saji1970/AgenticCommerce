import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createPaymentIntentSchema } from '../schemas/payment.schema';

const router = Router();

/**
 * @route   POST /api/v1/payments/setup-intent
 * @desc    Create a setup intent for saving payment methods
 * @access  Private
 */
router.post('/setup-intent', authenticate, paymentController.createSetupIntent);

/**
 * @route   POST /api/v1/payments/payment-intent
 * @desc    Create a payment intent for agent-initiated purchase
 * @access  Private
 */
router.post('/payment-intent', authenticate, validateRequest(createPaymentIntentSchema), paymentController.createPaymentIntent);

/**
 * @route   POST /api/v1/payments/confirm
 * @desc    Confirm a payment
 * @access  Private
 */
router.post('/confirm', authenticate, paymentController.confirmPayment);

/**
 * @route   GET /api/v1/payments/methods
 * @desc    Get user's saved payment methods
 * @access  Private
 */
router.get('/methods', authenticate, paymentController.getPaymentMethods);

/**
 * @route   DELETE /api/v1/payments/methods/:methodId
 * @desc    Delete a payment method
 * @access  Private
 */
router.delete('/methods/:methodId', authenticate, paymentController.deletePaymentMethod);

/**
 * @route   GET /api/v1/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/history', authenticate, paymentController.getPaymentHistory);

export default router;
