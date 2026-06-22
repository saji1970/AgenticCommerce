import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@agentic-commerce/validation';

const router: RouterType = Router();
const authController = new AuthController();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Password reset (public)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Change password (authenticated)
router.post('/change-password', authenticateToken, validate(changePasswordSchema), authController.changePassword);

export default router;
