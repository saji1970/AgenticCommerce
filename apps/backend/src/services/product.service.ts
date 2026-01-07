import {
  AISearchRequest,
  AISearchResponse,
  Product,
  ProductFilters,
  SearchQuery,
  CreateProductDTO,
  PaginatedProducts,
} from '@agentic-commerce/shared-types';
import { ProductRepository } from '../repositories/product.repository';
import { SearchQueryRepository } from '../repositories/search-query.repository';
import { ProductFilterRepository } from '../repositories/product-filter.repository';
import { SearchService } from './search.service';
import { AIService } from './ai.service';
import { MCPService } from './mcp.service';
import { AppError } from '../middleware/errorHandler';

export class ProductService {
  private productRepository: ProductRepository;
  private searchQueryRepository: SearchQueryRepository;
  private filterRepository: ProductFilterRepository;
  private searchService: SearchService;
  private aiService: AIService;
  private mcpService: MCPService;

  constructor() {
    this.productRepository = new ProductRepository();
    this.searchQueryRepository = new SearchQueryRepository();
    this.filterRepository = new ProductFilterRepository();
    this.searchService = new SearchService();
    this.aiService = new AIService();
    this.mcpService = new MCPService();
  }

  async performAISearch(userId: string, request: AISearchRequest): Promise<AISearchResponse> {
    const startTime = Date.now();
    let aiTokensUsed = 0;

    // Create search query record
    const searchQuery = await this.searchQueryRepository.create({
      userId,
      queryText: request.query,
      metadata: request.filters,
    });

    try {
      // Update status to processing
      await this.searchQueryRepository.updateStatus(searchQuery.id, 'processing');

      // Step 1: Fetch from Google Custom Search
      console.log(`🔍 Searching Google for: "${request.query}"`);
      const searchResults = await this.searchService.search(request.query, {
        maxResults: request.filters?.maxResults || 10,
      });

      if (searchResults.length === 0) {
        await this.searchQueryRepository.complete(searchQuery.id, 0);
        return {
          searchQueryId: searchQuery.id,
          products: [],
          filters: [],
          metadata: {
            totalResults: 0,
            processingTimeMs: Date.now() - startTime,
            aiTokensUsed: 0,
            sourcesUsed: ['google_search'],
          },
        };
      }

      // Step 2: Filter shoppable products using Claude
      console.log(`🤖 Filtering ${searchResults.length} results with Claude...`);
      const filteredResults = await this.aiService.filterShoppableProducts(searchResults);
      const shoppableResults = filteredResults.filter(r => r.isShoppable && r.confidence > 50);

      console.log(`✅ Found ${shoppableResults.length} shoppable products`);

      // Step 3: Fetch from MCP servers in parallel
      console.log(`🔌 Fetching from MCP servers...`);
      let mcpProducts: CreateProductDTO[] = [];
      try {
        mcpProducts = await this.mcpService.searchProducts(request.query);
        console.log(`✅ Found ${mcpProducts.length} products from MCP servers`);
      } catch (error) {
        console.error('MCP search failed:', error);
        // Continue without MCP results
      }

      // Step 4: Extract product data from URLs using Claude
      console.log(`📦 Extracting product data from ${shoppableResults.length} URLs...`);
      const extractionPromises = shoppableResults.slice(0, 10).map(async (result) => {
        try {
          const html = await this.searchService.fetchPageContent(result.url);
          const productData = await this.aiService.extractProductData(result.url, html);

          if (!productData) {
            return null;
          }

          return {
            userId,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            currency: productData.currency || 'USD',
            imageUrl: productData.imageUrl,
            productUrl: result.url,
            source: `google_search:${result.displayUrl}`,
            rawData: productData,
            aiExtracted: true,
          } as CreateProductDTO;
        } catch (error) {
          console.error(`Failed to extract from ${result.url}:`, error);
          return null;
        }
      });

      const extractedProducts = (await Promise.all(extractionPromises)).filter(
        (p): p is CreateProductDTO => p !== null
      );

      console.log(`✅ Successfully extracted ${extractedProducts.length} products`);

      // Step 5: Combine and deduplicate
      const allProductDTOs = [...extractedProducts, ...mcpProducts.map(p => ({ ...p, userId }))];

      // Remove duplicates based on productUrl
      const uniqueProducts = allProductDTOs.reduce((acc, product) => {
        if (!acc.find(p => p.productUrl === product.productUrl)) {
          acc.push(product);
        }
        return acc;
      }, [] as CreateProductDTO[]);

      // Step 6: Save products to database
      console.log(`💾 Saving ${uniqueProducts.length} products to database...`);
      const savedProducts = await this.productRepository.bulkCreate(uniqueProducts);

      // Step 7: Generate filters using Claude
      console.log(`🎛️  Generating filters...`);
      const generatedFilters = await this.aiService.generateFilters(savedProducts);
      const filtersWithSearchId = generatedFilters.map(f => ({
        ...f,
        searchQueryId: searchQuery.id,
      }));

      const savedFilters = await this.filterRepository.bulkCreate(filtersWithSearchId);

      // Step 8: Complete search query
      await this.searchQueryRepository.complete(searchQuery.id, savedProducts.length);

      const processingTimeMs = Date.now() - startTime;

      console.log(`✅ Search complete! Found ${savedProducts.length} products in ${processingTimeMs}ms`);

      const sourcesUsed = ['google_search'];
      if (mcpProducts.length > 0) {
        const mcpSources = mcpProducts.map(p => p.source).filter((s, i, arr) => arr.indexOf(s) === i);
        sourcesUsed.push(...mcpSources);
      }

      return {
        searchQueryId: searchQuery.id,
        products: savedProducts,
        filters: savedFilters,
        metadata: {
          totalResults: savedProducts.length,
          processingTimeMs,
          aiTokensUsed,
          sourcesUsed,
        },
      };
    } catch (error: any) {
      // Update search query with error
      await this.searchQueryRepository.setError(searchQuery.id, error.message);
      throw error;
    }
  }

  async getProducts(userId: string, filters?: ProductFilters): Promise<PaginatedProducts> {
    const products = await this.productRepository.findByUserId(userId, filters);
    const total = await this.productRepository.countByUserId(userId, filters);

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const hasMore = total > page * limit;

    return {
      products,
      total,
      page,
      limit,
      hasMore,
    };
  }

  async getProductById(productId: string, userId: string): Promise<Product | null> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      return null;
    }

    // Ensure product belongs to user
    if (product.userId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    return product;
  }

  async deleteProduct(productId: string, userId: string): Promise<boolean> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    // Ensure product belongs to user
    if (product.userId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    return await this.productRepository.delete(productId);
  }

  async getSearchHistory(userId: string, limit: number = 10): Promise<SearchQuery[]> {
    return await this.searchQueryRepository.findByUserId(userId, limit);
  }

  async getSearchQueryWithProducts(
    searchQueryId: string,
    userId: string
  ): Promise<{ query: SearchQuery; products: Product[] } | null> {
    const query = await this.searchQueryRepository.findById(searchQueryId);

    if (!query) {
      return null;
    }

    // Ensure query belongs to user
    if (query.userId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    // Get products for this search (stored in metadata or fetch separately)
    // For now, return empty array as we don't have a direct link
    // In a production system, you might add search_query_id to products table
    const products: Product[] = [];

    return { query, products };
  }
}
