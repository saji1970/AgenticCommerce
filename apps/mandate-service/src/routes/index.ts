import { Router } from 'express';
import type { Router as RouterType } from 'express';
import merchantRoutes from './merchant.routes';
import aiAgentAppRoutes from './ai-agent-app.routes';
import mandateRoutes from './mandate.routes';
import paymentRoutes from './payment.routes';

const router: RouterType = Router();

router.use('/merchants', merchantRoutes);
router.use('/ai-agent-apps', aiAgentAppRoutes);
router.use('/mandates', mandateRoutes);
router.use('/payments', paymentRoutes);

export default router;
