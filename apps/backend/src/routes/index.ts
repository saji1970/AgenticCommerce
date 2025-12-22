import { Router } from 'express';
import authRoutes from './auth.routes';
import agentRoutes from './agent.routes';
import productRoutes from './product.routes';
import paymentRoutes from './payment.routes';
import userRoutes from './user.routes';
import reviewRoutes from './review.routes';
import { createMandateRoutes } from './mandate.routes';
import { mandateController } from '../config/services';

const router = Router();

// API version prefix
const API_VERSION = '/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/agent`, agentRoutes);
router.use(`${API_VERSION}/products`, productRoutes);
router.use(`${API_VERSION}/payments`, paymentRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/reviews`, reviewRoutes);
router.use(`${API_VERSION}/mandates`, createMandateRoutes(mandateController));

export default router;
