import {
  AISearchRequest,
  AISearchResponse,
  Product,
  ProductFilters,
  SearchQuery,
  CreateProductDTO,
  PaginatedProducts,
  MandateType,
} from '@agentic-commerce/shared-types';
import { ProductRepository } from '../repositories/product.repository';
import { SearchQueryRepository } from '../repositories/search-query.repository';
import { ProductFilterRepository } from '../repositories/product-filter.repository';
import { SearchService } from './search.service';
import { AIService } from './ai.service';
import { MCPService } from './mcp.service';
import { NLPService, ParsedSearchQuery } from './nlp.service';
import { AppError } from '../middleware/errorHandler';
import { isDemoUserById } from '../utils/demo-users';

export class ProductService {
  private productRepository: ProductRepository;
  private searchQueryRepository: SearchQueryRepository;
  private filterRepository: ProductFilterRepository;
  private searchService: SearchService;
  private aiService: AIService;
  private mcpService: MCPService;
  private nlpService: NLPService;

  constructor() {
    this.productRepository = new ProductRepository();
    this.searchQueryRepository = new SearchQueryRepository();
    this.filterRepository = new ProductFilterRepository();
    this.searchService = new SearchService();
    this.aiService = new AIService();
    this.mcpService = new MCPService();
    this.nlpService = new NLPService();
  }

  async performAISearch(userId: string, request: AISearchRequest): Promise<AISearchResponse> {
    const startTime = Date.now();
    let aiTokensUsed = 0;

    // Check if user is a demo user - use sample data instead of real API calls
    const isDemoUser = await isDemoUserById(userId);
    if (isDemoUser) {
      console.log(`🎭 Demo user detected - using sample data for: "${request.query}"`);
      return await this.getDemoProducts(userId, request.query, request.filters);
    }

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

          // Skip products without required fields (name is required in database)
          if (!productData.name || !productData.name.trim()) {
            console.warn(`Skipping product with no name from ${result.url}`);
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
            searchQueryId: searchQuery.id,
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
      const allProductDTOs = [
        ...extractedProducts,
        ...mcpProducts.map(p => ({ ...p, userId, searchQueryId: searchQuery.id }))
      ];

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

  /**
   * Perform NLP-powered natural language search
   * Parses natural language query, extracts intent and constraints,
   * performs intelligent search with filters, and optionally creates purchase intent
   */
  async performNLPSearch(
    userId: string,
    naturalLanguageQuery: string,
    createMandate: boolean = false
  ): Promise<{
    searchResponse: AISearchResponse;
    parsedQuery: ParsedSearchQuery;
    intentCreated?: any;
    mandateCreated?: any;
  }> {
    console.log(`🧠 Starting NLP-powered search for: "${naturalLanguageQuery}"`);

    // Step 1: Parse natural language query with Claude
    const parsedQuery = await this.nlpService.parseSearchQuery(naturalLanguageQuery);

    console.log(`✅ NLP parsing complete:`, {
      searchQuery: parsedQuery.searchQuery,
      productType: parsedQuery.productType,
      maxPrice: parsedQuery.maxPrice,
      shouldCreateIntent: parsedQuery.shouldCreateIntent,
      confidence: parsedQuery.confidence,
    });

    // Step 2: Perform AI search with extracted search query and constraints
    const searchRequest: AISearchRequest = {
      query: parsedQuery.searchQuery,
      filters: {
        priceRange:
          parsedQuery.maxPrice || parsedQuery.minPrice
            ? {
                max: parsedQuery.maxPrice,
                min: parsedQuery.minPrice,
              }
            : undefined,
      },
    };

    const searchResponse = await this.performAISearch(userId, searchRequest);

    // Step 3: Auto-create intent if requested and confidence is high
    let intentCreated = null;
    let mandateCreated = null;

    if (parsedQuery.shouldCreateIntent && parsedQuery.confidence >= 70) {
      try {
        console.log(`🎯 Preparing purchase intent based on NLP parsing`);

        intentCreated = {
          type: parsedQuery.intentType,
          reasoning: parsedQuery.intentReasoning,
          productType: parsedQuery.productType,
          maxPrice: parsedQuery.maxPrice,
          startDate: parsedQuery.startDate,
          endDate: parsedQuery.endDate,
          origin: parsedQuery.origin,
          destination: parsedQuery.destination,
          specifications: parsedQuery.specifications,
          mandateId: undefined as string | undefined,
          mandateStatus: undefined as string | undefined,
        };

        console.log(`✅ Intent data prepared:`, intentCreated);

        // Step 4: Auto-create mandate if requested
        if (createMandate) {
          console.log(`🔐 Auto-creating intent mandate for autonomous purchases`);

          const { MandateService } = await import('./mandate.service');
          const mandateService = new MandateService();

          // Create mandate with constraints based on parsed query
          const mandateRequest = {
            agentId: 'nlp-search-agent',
            agentName: 'NLP Search Agent',
            type: MandateType.INTENT,
            constraints: {
              maxIntentsPerDay: 5,
              maxIntentValue: parsedQuery.maxPrice || 5000,
              autoApproveUnder: parsedQuery.maxPrice ? Math.min(parsedQuery.maxPrice * 0.8, 100) : 50,
              expiryHours: parsedQuery.endDate
                ? Math.ceil((new Date(parsedQuery.endDate).getTime() - Date.now()) / (1000 * 60 * 60))
                : 168, // Default 7 days
            },
            validUntil: parsedQuery.endDate ? new Date(parsedQuery.endDate) : undefined,
          };

          mandateCreated = await mandateService.createMandate(userId, mandateRequest);

          console.log(`✅ Mandate created: ${mandateCreated.id}`);

          // Add mandate info to intent
          intentCreated.mandateId = mandateCreated.id;
          intentCreated.mandateStatus = mandateCreated.status;
        }
      } catch (error) {
        console.error('Failed to create intent/mandate:', error);
        // Don't fail the search if intent/mandate creation fails
      }
    }

    return {
      searchResponse,
      parsedQuery,
      intentCreated,
      mandateCreated,
    };
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

    // Get products for this specific search query
    const products = await this.productRepository.findBySearchQueryId(searchQueryId);

    return { query, products };
  }

  async deleteSearchQuery(searchQueryId: string, userId: string): Promise<boolean> {
    const query = await this.searchQueryRepository.findById(searchQueryId);

    if (!query) {
      throw new AppError(404, 'Search query not found', 'SEARCH_QUERY_NOT_FOUND');
    }

    // Ensure query belongs to user
    if (query.userId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    return await this.searchQueryRepository.delete(searchQueryId);
  }

  async getFrequentlySearchedProducts(userId: string, limit: number = 8): Promise<Product[]> {
    // Get user's recent search queries (last 10)
    const recentQueries = await this.searchQueryRepository.findByUserId(userId, 10);

    if (recentQueries.length === 0) {
      return [];
    }

    // Get products from these search queries
    const queryIds = recentQueries.map(q => q.id);
    const allProducts = await this.productRepository.findBySearchQueryIds(queryIds);

    // Group products by name and count occurrences
    const productMap = new Map<string, { product: Product; count: number }>();

    allProducts.forEach(product => {
      const key = product.name.toLowerCase().trim();
      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.count++;
        // Keep the most recent product if duplicates
        if (new Date(product.createdAt) > new Date(existing.product.createdAt)) {
          existing.product = product;
        }
      } else {
        productMap.set(key, { product, count: 1 });
      }
    });

    // Sort by count (most frequently searched first) and return top products
    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(item => item.product);

    return sortedProducts;
  }

  /**
   * Get demo products for demo users
   * Matches search query against existing demo search queries and returns associated products
   */
  private async getDemoProducts(
    userId: string,
    searchQuery: string,
    filters?: AISearchRequest['filters']
  ): Promise<AISearchResponse> {
    const startTime = Date.now();

    // Normalize search query for matching
    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Find matching search queries for this user
    // Try to find an exact match or partial match
    const allUserQueries = await this.searchQueryRepository.findByUserId(userId, 100);
    
    // Find the best matching search query
    let matchingQuery: SearchQuery | null = null;
    let bestMatch = 0;

    for (const query of allUserQueries) {
      const queryText = query.queryText.toLowerCase();
      
      // Exact match
      if (queryText === normalizedQuery) {
        matchingQuery = query;
        bestMatch = 100;
        break;
      }
      
      // Check if search query contains keywords from normalized query
      const queryWords = normalizedQuery.split(/\s+/);
      const queryTextWords = queryText.split(/\s+/);
      const matchCount = queryWords.filter(word => 
        queryTextWords.some(qWord => qWord.includes(word) || word.includes(qWord))
      ).length;
      
      const matchScore = (matchCount / queryWords.length) * 100;
      if (matchScore > bestMatch && matchScore > 50) {
        bestMatch = matchScore;
        matchingQuery = query;
      }
    }

    // If no matching query found for this user, try to find matching products from other demo users
    if (!matchingQuery) {
      // Get all demo user IDs and check their search queries
      const { isDemoUserByEmail } = await import('../utils/demo-users');
      const { query } = await import('../config/database');
      
      // Find all demo users
      const demoUserEmails = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
      const demoUsersResult = await query(
        `SELECT id, email FROM users WHERE email = ANY($1)`,
        [demoUserEmails]
      );
      
      const demoUserIds = demoUsersResult.rows.map(row => row.id);
      
      // Try to find a matching search query from any demo user
      for (const demoUserId of demoUserIds) {
        const demoQueries = await this.searchQueryRepository.findByUserId(demoUserId, 100);
        for (const query of demoQueries) {
          const queryText = query.queryText.toLowerCase();
          if (queryText.includes(normalizedQuery) || normalizedQuery.includes(queryText)) {
            matchingQuery = query;
            break;
          }
        }
        if (matchingQuery) break;
      }
    }

    // If still no matching query found, create a new search query and return empty results
    if (!matchingQuery) {
      const searchQueryRecord = await this.searchQueryRepository.create({
        userId,
        queryText: searchQuery,
        metadata: filters,
      });
      
      await this.searchQueryRepository.complete(searchQueryRecord.id, 0);
      
      console.log(`⚠️  No matching demo products found for query: "${searchQuery}"`);
      
      return {
        searchQueryId: searchQueryRecord.id,
        products: [],
        filters: [],
        metadata: {
          totalResults: 0,
          processingTimeMs: Date.now() - startTime,
          aiTokensUsed: 0,
          sourcesUsed: ['demo_data'],
        },
      };
    }

    // Get products for the matching search query (even if from a different demo user)
    let products = await this.productRepository.findBySearchQueryId(matchingQuery.id);

    // Apply price filters if provided
    if (filters?.priceRange) {
      if (filters.priceRange.min !== undefined) {
        products = products.filter(p => p.price >= filters.priceRange!.min!);
      }
      if (filters.priceRange.max !== undefined) {
        products = products.filter(p => p.price <= filters.priceRange!.max!);
      }
    }

    // Limit results
    const maxResults = filters?.maxResults || 10;
    products = products.slice(0, maxResults);

    // Create search query record for this user
    const searchQueryRecord = await this.searchQueryRepository.create({
      userId,
      queryText: searchQuery,
      metadata: { ...filters, matchedDemoQuery: matchingQuery.id, sourceUserId: matchingQuery.userId },
    });

    await this.searchQueryRepository.complete(searchQueryRecord.id, products.length);

    console.log(`✅ Found ${products.length} demo products for query: "${searchQuery}"`);

    return {
      searchQueryId: searchQueryRecord.id,
      products,
      filters: [],
      metadata: {
        totalResults: products.length,
        processingTimeMs: Date.now() - startTime,
        aiTokensUsed: 0,
        sourcesUsed: ['demo_data'],
        matchedDemoQuery: matchingQuery.id,
      },
    };
  }
}
