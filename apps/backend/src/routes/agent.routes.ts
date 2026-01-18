import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: RouterType = Router();
const agentController = new AgentController();

// Public routes (no auth required) - for getting available agents
router.get('/', agentController.getAllAgents);
router.get('/active', agentController.getAllAgents);
router.get('/agent-id/:agentId', agentController.getAgentByAgentId);

// Protected routes (auth required) - for managing agents
router.use(authenticateToken);
router.get('/:id', agentController.getAgent);
router.post('/', agentController.createAgent);
router.put('/:id', agentController.updateAgent);
router.delete('/:id', agentController.deleteAgent);

export default router;
