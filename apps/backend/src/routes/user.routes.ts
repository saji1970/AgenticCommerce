import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateUserSchema } from '@agentic-commerce/validation';

const router: RouterType = Router();
const userController = new UserController();

// All user routes require authentication
router.use(authenticateToken);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateUserSchema), userController.updateProfile);

export default router;
