import { Router } from 'express';
import { agentController } from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { chatRequestSchema } from '../schemas/agent.schema';

const router = Router();

/**
 * @route   POST /api/v1/agent/chat
 * @desc    Send a message to the AI shopping agent
 * @access  Private
 */
router.post('/chat', authenticate, validateRequest(chatRequestSchema), agentController.chat);

/**
 * @route   POST /api/v1/agent/search
 * @desc    Agent-initiated product search
 * @access  Private
 */
router.post('/search', authenticate, agentController.search);

/**
 * @route   POST /api/v1/agent/compare
 * @desc    Compare multiple products
 * @access  Private
 */
router.post('/compare', authenticate, agentController.compare);

/**
 * @route   GET /api/v1/agent/sessions/:sessionId
 * @desc    Get conversation session history
 * @access  Private
 */
router.get('/sessions/:sessionId', authenticate, agentController.getSession);

/**
 * @route   GET /api/v1/agent/sessions
 * @desc    Get all user conversation sessions
 * @access  Private
 */
router.get('/sessions', authenticate, agentController.getSessions);

export default router;
