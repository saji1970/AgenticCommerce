import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { visualSearchService } from '../config/services';
import { productSearchService } from '../config/services';

class VisualSearchController {
  async analyzeImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { image } = req.body; // base64 encoded image

      if (!image) {
        res.status(400).json({ error: 'Image is required' });
        return;
      }

      // Analyze image with visual search service
      const analysis = await visualSearchService.analyzeImage(image);

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      logger.error('Visual search analyze error:', error);
      next(error);
    }
  }

  async searchByImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { image, filters } = req.body;

      if (!image) {
        res.status(400).json({ error: 'Image is required' });
        return;
      }

      // Analyze image
      const analysis = await visualSearchService.analyzeImage(image);

      // Search for products using the suggested query
      const products = await productSearchService.searchProducts({
        query: analysis.suggestedQuery,
        ...filters,
      });

      res.json({
        success: true,
        analysis,
        products,
        totalResults: products.length,
      });
    } catch (error) {
      logger.error('Visual search by image error:', error);
      next(error);
    }
  }

  async findSimilarProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const { limit = 10 } = req.query;

      // TODO: Implement similar products logic
      // This would use product features, category, price range, etc.

      res.json({
        success: true,
        similarProducts: [],
        message: 'Similar products feature coming soon',
      });
    } catch (error) {
      logger.error('Find similar products error:', error);
      next(error);
    }
  }
}

export const visualSearchController = new VisualSearchController();
