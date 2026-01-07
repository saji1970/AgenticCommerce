import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { AISearchRequest, ProductFilters } from '@agentic-commerce/shared-types';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  aiSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const searchRequest: AISearchRequest = req.body;

      const result = await this.productService.performAISearch(userId, searchRequest);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const filters: ProductFilters = {
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        source: req.query.source as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'price' | 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.productService.getProducts(userId, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const product = await this.productService.getProductById(id, userId);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Product not found',
            code: 'PRODUCT_NOT_FOUND',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await this.productService.deleteProduct(id, userId);

      res.status(200).json({
        success: true,
        data: { message: 'Product deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  };

  getSearchHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const history = await this.productService.getSearchHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  getSearchQueryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await this.productService.getSearchQueryWithProducts(id, userId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Search query not found',
            code: 'SEARCH_QUERY_NOT_FOUND',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
