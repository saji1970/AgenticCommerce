import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AIAgentAppController } from '../controllers/ai-agent-app.controller';

const router: RouterType = Router();
const agentAppController = new AIAgentAppController();

// AI Agent App configuration routes
router.post('/', agentAppController.createAgentApp);
router.get('/', agentAppController.getAllAgentApps);
router.get('/:id', agentAppController.getAgentApp);
router.put('/:id', agentAppController.updateAgentApp);
router.delete('/:id', agentAppController.deleteAgentApp);

export default router;
