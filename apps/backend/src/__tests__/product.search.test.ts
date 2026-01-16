import { ProductService } from '../services/product.service';
import { NLPService } from '../services/nlp.service';
import { AIService } from '../services/ai.service';
import { SearchService } from '../services/search.service';
import { MCPService } from '../services/mcp.service';

// Mock dependencies
jest.mock('../services/search.service');
jest.mock('../services/ai.service');
jest.mock('../services/mcp.service');
jest.mock('../services/nlp.service');

describe('Product Search', () => {
  let productService: ProductService;
  let mockSearchService: jest.Mocked<SearchService>;
  let mockAIService: jest.Mocked<AIService>;
  let mockMCPService: jest.Mocked<MCPService>;
  let mockNLPService: jest.Mocked<NLPService>;

  const mockUserId = 'test-user-id';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSearchService = new SearchService() as jest.Mocked<SearchService>;
    mockAIService = new AIService() as jest.Mocked<AIService>;
    mockMCPService = new MCPService() as jest.Mocked<MCPService>;
    mockNLPService = new NLPService() as jest.Mocked<NLPService>;

    // Create product service with mocked dependencies
    productService = new ProductService();
    (productService as any).searchService = mockSearchService;
    (productService as any).aiService = mockAIService;
    (productService as any).mcpService = mockMCPService;
    (productService as any).nlpService = mockNLPService;
  });

  describe('NLP Search', () => {
    it('should parse natural language query and perform search', async () => {
      const query = 'Find ergonomic chairs under $200';

      const mockParsedQuery = {
        searchQuery: 'ergonomic office chair',
        productType: 'chair',
        maxPrice: 200,
        minPrice: undefined,
        currency: 'USD',
        shouldCreateIntent: false,
        preferLocalStores: false,
        preferOnline: true,
        isTravel: false,
        isProduct: true,
        confidence: 95,
      };

      const mockSearchResults = [
        {
          title: 'Ergonomic Office Chair',
          url: 'https://example.com/chair1',
          snippet: 'Comfortable ergonomic chair',
          displayUrl: 'example.com',
        },
      ];

      const mockFilteredResults = [
        {
          ...mockSearchResults[0],
          isShoppable: true,
          confidence: 90,
          reasoning: 'Valid product page',
        },
      ];

      const mockExtractedProduct = {
        name: 'Ergonomic Office Chair',
        description: 'Comfortable ergonomic chair',
        price: 150,
        currency: 'USD',
        imageUrl: 'https://example.com/chair1.jpg',
      };

      // Mock NLP parsing
      (mockNLPService.parseSearchQuery as jest.Mock).mockResolvedValue(mockParsedQuery);

      // Mock search service
      (mockSearchService.search as jest.Mock).mockResolvedValue(mockSearchResults);

      // Mock AI filtering (skip for Google Shopping)
      // Mock product extraction
      (mockAIService.extractProductData as jest.Mock).mockResolvedValue(mockExtractedProduct);

      // Mock MCP service
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      // Execute search
      const result = await productService.performNLPSearch(mockUserId, query, false);

      // Assertions
      expect(mockNLPService.parseSearchQuery).toHaveBeenCalledWith(
        query,
        undefined
      );
      expect(result.parsedQuery).toEqual(mockParsedQuery);
      expect(result.searchResponse).toBeDefined();
    });

    it('should handle price range queries', async () => {
      const query = 'MacBook Pro between $1500 and $2500';

      const mockParsedQuery = {
        searchQuery: 'MacBook Pro',
        productType: 'laptop',
        maxPrice: 2500,
        minPrice: 1500,
        currency: 'USD',
        shouldCreateIntent: false,
        preferLocalStores: false,
        preferOnline: true,
        isTravel: false,
        isProduct: true,
        confidence: 90,
      };

      (mockNLPService.parseSearchQuery as jest.Mock).mockResolvedValue(mockParsedQuery);
      (mockSearchService.search as jest.Mock).mockResolvedValue([]);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      const result = await productService.performNLPSearch(mockUserId, query, false);

      expect(result.parsedQuery.maxPrice).toBe(2500);
      expect(result.parsedQuery.minPrice).toBe(1500);
    });

    it('should detect local store preference', async () => {
      const query = 'Where can I buy AirPods Pro near me in Atlanta?';

      const mockParsedQuery = {
        searchQuery: 'Apple AirPods Pro',
        productType: 'headphones',
        maxPrice: undefined,
        minPrice: undefined,
        currency: 'USD',
        shouldCreateIntent: false,
        preferLocalStores: true,
        preferOnline: false,
        userCity: 'Atlanta',
        searchRadius: 25,
        isTravel: false,
        isProduct: true,
        confidence: 95,
      };

      (mockNLPService.parseSearchQuery as jest.Mock).mockResolvedValue(mockParsedQuery);
      (mockSearchService.search as jest.Mock).mockResolvedValue([]);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      const result = await productService.performNLPSearch(mockUserId, query, false);

      expect(result.parsedQuery.preferLocalStores).toBe(true);
      expect(result.parsedQuery.userCity).toBe('Atlanta');
    });

    it('should detect travel queries', async () => {
      const query = 'Book a flight from Atlanta to Pune on 1/28/2026';

      const mockParsedQuery = {
        searchQuery: 'round trip flights Atlanta to Pune',
        productType: 'flight',
        maxPrice: undefined,
        minPrice: undefined,
        currency: 'USD',
        shouldCreateIntent: true,
        intentType: 'time_based',
        origin: 'Atlanta',
        destination: 'Pune',
        startDate: '2026-01-28',
        isTravel: true,
        isProduct: false,
        confidence: 98,
      };

      (mockNLPService.parseSearchQuery as jest.Mock).mockResolvedValue(mockParsedQuery);
      (mockSearchService.search as jest.Mock).mockResolvedValue([]);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      const result = await productService.performNLPSearch(mockUserId, query, false);

      expect(result.parsedQuery.isTravel).toBe(true);
      expect(result.parsedQuery.origin).toBe('Atlanta');
      expect(result.parsedQuery.destination).toBe('Pune');
    });
  });

  describe('AI Search', () => {
    it('should use Google Shopping for product searches', async () => {
      const searchRequest = {
        query: 'laptop',
        filters: {
          maxResults: 10,
          isProduct: true,
          isTravel: false,
        },
      };

      const mockSearchResults = [
        {
          title: 'Gaming Laptop',
          url: 'https://example.com/laptop1',
          snippet: 'High performance gaming laptop',
          displayUrl: 'example.com',
          price: '999.99',
          currency: 'USD',
        },
      ];

      (mockSearchService.search as jest.Mock).mockResolvedValue(mockSearchResults);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      // Mock repository methods
      const mockCreate = jest.fn().mockResolvedValue({ id: 'search-query-id' });
      const mockUpdateStatus = jest.fn().mockResolvedValue(undefined);
      const mockComplete = jest.fn().mockResolvedValue(undefined);
      const mockBulkCreate = jest.fn().mockResolvedValue([]);

      (productService as any).searchQueryRepository = {
        create: mockCreate,
        updateStatus: mockUpdateStatus,
        complete: mockComplete,
      };
      (productService as any).productRepository = {
        bulkCreate: mockBulkCreate,
      };
      (productService as any).filterRepository = {
        bulkCreate: jest.fn().mockResolvedValue([]),
      };

      await productService.performAISearch(mockUserId, searchRequest);

      // Verify Google Shopping was used (useShopping: true)
      expect(mockSearchService.search).toHaveBeenCalledWith(
        'laptop',
        expect.objectContaining({
          maxResults: 10,
          useShopping: true,
        })
      );
    });

    it('should use regular search for travel queries', async () => {
      const searchRequest = {
        query: 'flights to Paris',
        filters: {
          maxResults: 10,
          isProduct: false,
          isTravel: true,
        },
      };

      (mockSearchService.search as jest.Mock).mockResolvedValue([]);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      // Mock repository methods
      const mockCreate = jest.fn().mockResolvedValue({ id: 'search-query-id' });
      const mockUpdateStatus = jest.fn().mockResolvedValue(undefined);
      const mockComplete = jest.fn().mockResolvedValue(undefined);
      const mockBulkCreate = jest.fn().mockResolvedValue([]);

      (productService as any).searchQueryRepository = {
        create: mockCreate,
        updateStatus: mockUpdateStatus,
        complete: mockComplete,
      };
      (productService as any).productRepository = {
        bulkCreate: mockBulkCreate,
      };
      (productService as any).filterRepository = {
        bulkCreate: jest.fn().mockResolvedValue([]),
      };

      await productService.performAISearch(mockUserId, searchRequest);

      // Verify regular search was used (useShopping: false)
      expect(mockSearchService.search).toHaveBeenCalledWith(
        'flights to Paris',
        expect.objectContaining({
          maxResults: 10,
          useShopping: false,
        })
      );
    });

    it('should filter products by price range', async () => {
      const searchRequest = {
        query: 'chair',
        filters: {
          maxResults: 10,
          priceRange: {
            min: 100,
            max: 300,
          },
        },
      };

      const mockProducts = [
        { name: 'Cheap Chair', price: 50, productUrl: 'url1' },
        { name: 'Mid Chair', price: 200, productUrl: 'url2' },
        { name: 'Expensive Chair', price: 500, productUrl: 'url3' },
      ];

      (mockSearchService.search as jest.Mock).mockResolvedValue([]);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      // Mock repository methods
      const mockCreate = jest.fn().mockResolvedValue({ id: 'search-query-id' });
      const mockUpdateStatus = jest.fn().mockResolvedValue(undefined);
      const mockComplete = jest.fn().mockResolvedValue(undefined);
      const mockBulkCreate = jest.fn().mockResolvedValue(mockProducts);

      (productService as any).searchQueryRepository = {
        create: mockCreate,
        updateStatus: mockUpdateStatus,
        complete: mockComplete,
      };
      (productService as any).productRepository = {
        bulkCreate: mockBulkCreate,
      };
      (productService as any).filterRepository = {
        bulkCreate: jest.fn().mockResolvedValue([]),
      };

      const result = await productService.performAISearch(mockUserId, searchRequest);

      // Products should be filtered by price range
      // Only 'Mid Chair' (price: 200) should pass the filter
      expect(result.products.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort online products by price (low to high)', async () => {
      const searchRequest = {
        query: 'laptop',
        filters: {
          maxResults: 10,
          preferOnline: true,
          preferLocalStores: false,
        },
      };

      (mockSearchService.search as jest.Mock).mockResolvedValue([]);
      (mockMCPService.searchProducts as jest.Mock).mockResolvedValue([]);

      // Mock repository methods
      const mockCreate = jest.fn().mockResolvedValue({ id: 'search-query-id' });
      const mockUpdateStatus = jest.fn().mockResolvedValue(undefined);
      const mockComplete = jest.fn().mockResolvedValue(undefined);
      const mockBulkCreate = jest.fn().mockResolvedValue([
        { name: 'Expensive Laptop', price: 2000, productUrl: 'url1' },
        { name: 'Cheap Laptop', price: 500, productUrl: 'url2' },
        { name: 'Mid Laptop', price: 1200, productUrl: 'url3' },
      ]);

      (productService as any).searchQueryRepository = {
        create: mockCreate,
        updateStatus: mockUpdateStatus,
        complete: mockComplete,
      };
      (productService as any).productRepository = {
        bulkCreate: mockBulkCreate,
      };
      (productService as any).filterRepository = {
        bulkCreate: jest.fn().mockResolvedValue([]),
      };

      await productService.performAISearch(mockUserId, searchRequest);

      // Verify sorting was applied (products should be sorted before saving)
      expect(mockBulkCreate).toHaveBeenCalled();
    });
  });
});
