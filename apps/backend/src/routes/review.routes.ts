import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createProductReviewSchema,
  createRetailerReviewSchema,
} from '../schemas/review.schema';

const router = Router();

/**
 * @route   POST /api/v1/reviews/product
 * @desc    Create a product review
 * @access  Private
 */
router.post(
  '/product',
  authenticate,
  validateRequest(createProductReviewSchema),
  reviewController.createProductReview
);

/**
 * @route   GET /api/v1/reviews/product/:productId
 * @desc    Get reviews for a product
 * @access  Public
 */
router.get('/product/:productId', reviewController.getProductReviews);

/**
 * @route   POST /api/v1/reviews/retailer
 * @desc    Create a retailer/store review
 * @access  Private
 */
router.post(
  '/retailer',
  authenticate,
  validateRequest(createRetailerReviewSchema),
  reviewController.createRetailerReview
);

/**
 * @route   GET /api/v1/reviews/retailer/:retailerId
 * @desc    Get reviews for a retailer
 * @access  Public
 */
router.get('/retailer/:retailerId', reviewController.getRetailerReviews);

/**
 * @route   GET /api/v1/reviews/store/:storeLocationId
 * @desc    Get reviews for a specific store location
 * @access  Public
 */
router.get('/store/:storeLocationId', reviewController.getStoreLocationReviews);

/**
 * @route   POST /api/v1/reviews/:reviewId/helpful
 * @desc    Mark a review as helpful
 * @access  Private
 */
router.post('/:reviewId/helpful', authenticate, reviewController.markReviewHelpful);

/**
 * @route   PUT /api/v1/reviews/product/:reviewId
 * @desc    Update a product review
 * @access  Private
 */
router.put('/product/:reviewId', authenticate, reviewController.updateProductReview);

/**
 * @route   DELETE /api/v1/reviews/product/:reviewId
 * @desc    Delete a product review
 * @access  Private
 */
router.delete('/product/:reviewId', authenticate, reviewController.deleteProductReview);

export default router;
