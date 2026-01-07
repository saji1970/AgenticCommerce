import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { addToCartSchema, updateCartItemSchema } from '@agentic-commerce/validation';

const router: RouterType = Router();
const cartController = new CartController();

// All cart routes require authentication
router.use(authenticateToken);

// Add item to cart
router.post('/', validate(addToCartSchema), cartController.addToCart);

// Get user's cart
router.get('/', cartController.getCart);

// Update cart item
router.put('/:itemId', validate(updateCartItemSchema), cartController.updateCartItem);

// Remove item from cart
router.delete('/:itemId', cartController.removeFromCart);

// Clear cart (should be after /:itemId to avoid route conflict)
router.post('/clear', cartController.clearCart);

export default router;
