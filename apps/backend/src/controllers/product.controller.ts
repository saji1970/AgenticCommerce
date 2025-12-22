import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { productSearchService } from '../config/services';

class ProductController {
  async advancedSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        query: searchQuery,
        category,
        minPrice,
        maxPrice,
        latitude,
        longitude,
        radius = 50, // km
        availability,
        minRating,
        stores,
        sortBy = 'relevance',
        page = 1,
        limit = 20,
      } = req.body;

      // Search products from external sources
      const externalProducts = await productSearchService.searchProducts({
        query: searchQuery,
        category,
        minPrice,
        maxPrice,
      });

      // If location provided, find nearby stores and their products
      let products = externalProducts;

      if (latitude && longitude) {
        products = await this.enrichWithLocationData(
          externalProducts,
          latitude,
          longitude,
          radius
        );
      }

      // Apply filters
      products = this.applyFilters(products, {
        minPrice,
        maxPrice,
        minRating,
        availability,
        stores,
      });

      // Apply sorting
      products = this.applySorting(products, sortBy, latitude, longitude);

      // Pagination
      const startIndex = (page - 1) * limit;
      const paginatedProducts = products.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: products.length,
          totalPages: Math.ceil(products.length / limit),
        },
      });
    } catch (error) {
      logger.error('Advanced product search error:', error);
      next(error);
    }
  }

  async getNearbyStores(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: productId } = req.params;
      const { latitude, longitude, radius = 50 } = req.query;

      if (!latitude || !longitude) {
        res.status(400).json({ error: 'Latitude and longitude are required' });
        return;
      }

      // Find stores with this product available
      const result = await query(
        `SELECT
           sl.*,
           r.name as retailer_name,
           pa.in_stock,
           pa.quantity,
           calculate_distance($1, $2, sl.latitude, sl.longitude) as distance
         FROM store_locations sl
         JOIN retailers r ON sl.retailer_id = r.id
         LEFT JOIN product_availability pa ON pa.store_location_id = sl.id AND pa.product_id = $3
         WHERE calculate_distance($1, $2, sl.latitude, sl.longitude) <= $4
         ORDER BY distance ASC`,
        [latitude, longitude, productId, radius]
      );

      res.json({
        success: true,
        stores: result.rows,
      });
    } catch (error) {
      logger.error('Get nearby stores error:', error);
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await query('SELECT * FROM products WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        success: true,
        product: result.rows[0],
      });
    } catch (error) {
      logger.error('Get product error:', error);
      next(error);
    }
  }

  async getReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await query(
        `SELECT pr.*, u.first_name, u.last_name
         FROM product_reviews pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.product_id = $1
         ORDER BY pr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      const avgResult = await query(
        'SELECT AVG(rating) as average FROM product_reviews WHERE product_id = $1',
        [id]
      );

      res.json({
        productId: id,
        reviews: result.rows,
        averageRating: parseFloat(avgResult.rows[0]?.average || 0),
        totalReviews: result.rows.length,
      });
    } catch (error) {
      logger.error('Get reviews error:', error);
      next(error);
    }
  }

  async getPriceHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;

      const result = await query(
        `SELECT price, recorded_at, r.name as retailer_name
         FROM price_history ph
         JOIN retailers r ON ph.retailer_id = r.id
         WHERE ph.product_id = $1
           AND ph.recorded_at >= NOW() - INTERVAL '${days} days'
         ORDER BY ph.recorded_at ASC`,
        [id]
      );

      const currentResult = await query('SELECT price FROM products WHERE id = $1', [id]);

      res.json({
        productId: id,
        priceHistory: result.rows,
        currentPrice: currentResult.rows[0]?.price || 0,
      });
    } catch (error) {
      logger.error('Get price history error:', error);
      next(error);
    }
  }

  private async enrichWithLocationData(
    products: any[],
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<any[]> {
    // Calculate distance to nearest store for each product
    // This is a simplified version - in production, you'd query actual store locations

    return products.map((product) => ({
      ...product,
      distance: this.calculateRandomDistance(radius), // Placeholder
      availability: {
        ...product.availability,
        inStore: Math.random() > 0.5,
        online: true,
      },
    }));
  }

  private applyFilters(products: any[], filters: any): any[] {
    let filtered = [...products];

    if (filters.minPrice) {
      filtered = filtered.filter((p) => p.price >= filters.minPrice);
    }

    if (filters.maxPrice) {
      filtered = filtered.filter((p) => p.price <= filters.maxPrice);
    }

    if (filters.minRating) {
      filtered = filtered.filter((p) => p.rating >= filters.minRating);
    }

    if (filters.availability === 'online') {
      filtered = filtered.filter((p) => p.availability?.online);
    } else if (filters.availability === 'instore') {
      filtered = filtered.filter((p) => p.availability?.inStore);
    }

    if (filters.stores && filters.stores.length > 0) {
      filtered = filtered.filter((p) => filters.stores.includes(p.retailer.id));
    }

    return filtered;
  }

  private applySorting(
    products: any[],
    sortBy: string,
    latitude?: number,
    longitude?: number
  ): any[] {
    const sorted = [...products];

    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'distance':
        if (latitude && longitude) {
          return sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        }
        return sorted;
      default:
        return sorted;
    }
  }

  private calculateRandomDistance(maxRadius: number): number {
    return Math.random() * maxRadius;
  }
}

export const productController = new ProductController();
