import { Router } from 'express';
import type { Router as RouterType } from 'express';
import merchantRoutes from './merchant.routes';
import aiAgentAppRoutes from './ai-agent-app.routes';

const router: RouterType = Router();

router.use('/merchants', merchantRoutes);
router.use('/ai-agent-apps', aiAgentAppRoutes);

export default router;
