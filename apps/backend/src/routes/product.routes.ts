import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { visualSearchController } from '../controllers/visualSearch.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/v1/products/search
 * @desc    Advanced product search with filters
 * @access  Private
 */
router.post('/search', authenticate, productController.advancedSearch);

/**
 * @route   POST /api/v1/products/visual-search
 * @desc    Analyze image with AI
 * @access  Private
 */
router.post('/visual-search', authenticate, visualSearchController.analyzeImage);

/**
 * @route   POST /api/v1/products/search-by-image
 * @desc    Search products using image
 * @access  Private
 */
router.post('/search-by-image', authenticate, visualSearchController.searchByImage);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product details by ID
 * @access  Private
 */
router.get('/:id', authenticate, productController.getById);

/**
 * @route   GET /api/v1/products/:id/similar
 * @desc    Find similar products
 * @access  Private
 */
router.get('/:id/similar', authenticate, visualSearchController.findSimilarProducts);

/**
 * @route   GET /api/v1/products/:id/nearby-stores
 * @desc    Get nearby stores with this product
 * @access  Private
 */
router.get('/:id/nearby-stores', authenticate, productController.getNearbyStores);

/**
 * @route   GET /api/v1/products/:id/reviews
 * @desc    Get product reviews
 * @access  Public
 */
router.get('/:id/reviews', productController.getReviews);

/**
 * @route   GET /api/v1/products/:id/price-history
 * @desc    Get product price history
 * @access  Private
 */
router.get('/:id/price-history', authenticate, productController.getPriceHistory);

export default router;
