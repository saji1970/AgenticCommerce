import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { updatePreferencesSchema } from '../schemas/user.schema';

const router = Router();

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, userController.updateProfile);

/**
 * @route   GET /api/v1/users/preferences
 * @desc    Get user shopping preferences
 * @access  Private
 */
router.get('/preferences', authenticate, userController.getPreferences);

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user shopping preferences
 * @access  Private
 */
router.put('/preferences', authenticate, validateRequest(updatePreferencesSchema), userController.updatePreferences);

/**
 * @route   GET /api/v1/users/purchase-history
 * @desc    Get user purchase history
 * @access  Private
 */
router.get('/purchase-history', authenticate, userController.getPurchaseHistory);

export default router;
