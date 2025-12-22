import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';

class ReviewController {
  async createProductReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId, rating, title, content, verifiedPurchase, images } = req.body;
      const userId = req.user?.id;

      const result = await query(
        `INSERT INTO product_reviews
         (product_id, user_id, rating, title, content, verified_purchase, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [productId, userId, rating, title, content, verifiedPurchase || false, images || []]
      );

      // Update product average rating
      await this.updateProductRating(productId);

      res.status(201).json({
        success: true,
        review: result.rows[0],
      });
    } catch (error) {
      logger.error('Create product review error:', error);
      next(error);
    }
  }

  async getProductReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const { sort = 'recent', page = 1, limit = 10 } = req.query;

      let orderBy = 'created_at DESC';
      if (sort === 'helpful') orderBy = 'helpful_count DESC';
      if (sort === 'rating-high') orderBy = 'rating DESC';
      if (sort === 'rating-low') orderBy = 'rating ASC';

      const offset = (Number(page) - 1) * Number(limit);

      const result = await query(
        `SELECT pr.*, u.first_name, u.last_name
         FROM product_reviews pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.product_id = $1
         ORDER BY ${orderBy}
         LIMIT $2 OFFSET $3`,
        [productId, limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) FROM product_reviews WHERE product_id = $1',
        [productId]
      );

      const avgResult = await query(
        'SELECT AVG(rating) as average_rating FROM product_reviews WHERE product_id = $1',
        [productId]
      );

      res.json({
        reviews: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
        },
        averageRating: parseFloat(avgResult.rows[0].average_rating || 0),
      });
    } catch (error) {
      logger.error('Get product reviews error:', error);
      next(error);
    }
  }

  async createRetailerReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { retailerId, storeLocationId, rating, title, content, aspects, verifiedCustomer, images } =
        req.body;
      const userId = req.user?.id;

      const result = await query(
        `INSERT INTO retailer_reviews
         (retailer_id, store_location_id, user_id, rating, title, content, aspects, verified_customer, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          retailerId,
          storeLocationId || null,
          userId,
          rating,
          title,
          content,
          JSON.stringify(aspects || {}),
          verifiedCustomer || false,
          images || [],
        ]
      );

      // Update retailer trust score
      await this.updateRetailerTrustScore(retailerId);

      res.status(201).json({
        success: true,
        review: result.rows[0],
      });
    } catch (error) {
      logger.error('Create retailer review error:', error);
      next(error);
    }
  }

  async getRetailerReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { retailerId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await query(
        `SELECT rr.*, u.first_name, u.last_name, sl.name as store_name
         FROM retailer_reviews rr
         LEFT JOIN users u ON rr.user_id = u.id
         LEFT JOIN store_locations sl ON rr.store_location_id = sl.id
         WHERE rr.retailer_id = $1
         ORDER BY rr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [retailerId, limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) FROM retailer_reviews WHERE retailer_id = $1',
        [retailerId]
      );

      const avgResult = await query(
        'SELECT AVG(rating) as average_rating FROM retailer_reviews WHERE retailer_id = $1',
        [retailerId]
      );

      res.json({
        reviews: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
        },
        averageRating: parseFloat(avgResult.rows[0].average_rating || 0),
      });
    } catch (error) {
      logger.error('Get retailer reviews error:', error);
      next(error);
    }
  }

  async getStoreLocationReviews(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { storeLocationId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await query(
        `SELECT rr.*, u.first_name, u.last_name
         FROM retailer_reviews rr
         LEFT JOIN users u ON rr.user_id = u.id
         WHERE rr.store_location_id = $1
         ORDER BY rr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [storeLocationId, limit, offset]
      );

      res.json({ reviews: result.rows });
    } catch (error) {
      logger.error('Get store location reviews error:', error);
      next(error);
    }
  }

  async markReviewHelpful(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { helpful, reviewType } = req.body;
      const userId = req.user?.id;

      // Insert or update helpfulness
      await query(
        `INSERT INTO review_helpfulness (review_id, review_type, user_id, helpful)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (review_id, review_type, user_id)
         DO UPDATE SET helpful = $4`,
        [reviewId, reviewType, userId, helpful]
      );

      // Update helpful count
      const table = reviewType === 'product' ? 'product_reviews' : 'retailer_reviews';
      await query(
        `UPDATE ${table}
         SET helpful_count = (
           SELECT COUNT(*) FROM review_helpfulness
           WHERE review_id = $1 AND review_type = $2 AND helpful = true
         )
         WHERE id = $1`,
        [reviewId, reviewType]
      );

      res.json({ success: true });
    } catch (error) {
      logger.error('Mark review helpful error:', error);
      next(error);
    }
  }

  async updateProductReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { rating, title, content } = req.body;
      const userId = req.user?.id;

      const result = await query(
        `UPDATE product_reviews
         SET rating = $1, title = $2, content = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [rating, title, content, reviewId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Review not found or unauthorized' });
        return;
      }

      res.json({ success: true, review: result.rows[0] });
    } catch (error) {
      logger.error('Update product review error:', error);
      next(error);
    }
  }

  async deleteProductReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const userId = req.user?.id;

      const result = await query(
        'DELETE FROM product_reviews WHERE id = $1 AND user_id = $2 RETURNING product_id',
        [reviewId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Review not found or unauthorized' });
        return;
      }

      // Update product rating
      await this.updateProductRating(result.rows[0].product_id);

      res.json({ success: true });
    } catch (error) {
      logger.error('Delete product review error:', error);
      next(error);
    }
  }

  private async updateProductRating(productId: string): Promise<void> {
    await query(
      `UPDATE products
       SET rating = (
         SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = $1
       ),
       review_count = (
         SELECT COUNT(*) FROM product_reviews WHERE product_id = $1
       )
       WHERE id = $1`,
      [productId]
    );
  }

  private async updateRetailerTrustScore(retailerId: string): Promise<void> {
    await query(
      `UPDATE retailers
       SET trust_score = (
         SELECT COALESCE(AVG(rating) / 5.0, 0) FROM retailer_reviews WHERE retailer_id = $1
       )
       WHERE id = $1`,
      [retailerId]
    );
  }
}

export const reviewController = new ReviewController();
