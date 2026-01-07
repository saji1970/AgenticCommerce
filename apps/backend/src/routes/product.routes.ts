import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { aiSearchSchema } from '@agentic-commerce/validation';

const router: RouterType = Router();
const productController = new ProductController();

// All routes require authentication
router.use(authenticateToken);

// AI Search
router.post('/ai-search', validate(aiSearchSchema), productController.aiSearch);

// Products
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.delete('/:id', productController.deleteProduct);

// Search History
router.get('/search-history', productController.getSearchHistory);
router.get('/search-history/:id', productController.getSearchQueryById);

export default router;
