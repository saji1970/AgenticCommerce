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
import { MCPService, TravelSearchParams } from './mcp.service';
import { NLPService, ParsedSearchQuery } from './nlp.service';
import { AppError } from '../middleware/errorHandler';
import { isDemoUserById } from '../utils/demo-users';
import { extractPriceFromGoogleShoppingResult, parsePrice } from '../utils/price-extractor';

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

    // Check if user is a demo user - try sample data first, fall back to real API
    const isDemoUser = await isDemoUserById(userId);
    if (isDemoUser) {
      console.log(`🎭 Demo user detected - trying sample data for: "${request.query}"`);
      const demoResult = await this.getDemoProducts(userId, request.query, request.filters);
      if (demoResult.products.length > 0) {
        return demoResult;
      }
      console.log(`🔄 No demo products matched, falling back to Google search for: "${request.query}"`);
      // Fall through to Google search below
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

      // Step 1: Determine search type and fetch results
      const isProduct = (request.filters as any)?.isProduct ?? true;
      const isTravel = (request.filters as any)?.isTravel ?? false;
      const origin = (request.filters as any)?.origin;
      const destination = (request.filters as any)?.destination;
      const startDate = (request.filters as any)?.startDate;
      const endDate = (request.filters as any)?.endDate;

      let searchResults: any[] = [];

      // Build travel params for MCP servers
      const travelParams: TravelSearchParams | undefined = isTravel
        ? {
            isTravel: true,
            origin,
            destination,
            date: startDate,
            returnDate: endDate,
            productType: origin && destination ? 'flight' : undefined,
          }
        : undefined;

      // For travel with origin/destination, run SerpAPI + RapidAPI + MCP travel in parallel
      if (isTravel && origin && destination) {
        console.log(`✈️  Searching flights: ${origin} → ${destination} (SerpAPI + RapidAPI + MCP in parallel)`);

        const filters = request.filters as any;
        const flightParams = {
          origin,
          destination,
          departureDate: startDate,
          returnDate: endDate,
          query: request.query,
        };

        // Launch SerpAPI flights with full filter support
        const serpApiPromise = this.searchService.searchFlights({
          ...flightParams,
          travelClass: filters?.travelClass,
          adults: filters?.adults,
          children: filters?.children,
          infantsInSeat: filters?.infantsInSeat,
          infantsOnLap: filters?.infantsOnLap,
          stops: filters?.stops,
          sortBy: filters?.sortBy,
          deepSearch: filters?.deepSearch,
          maxPrice: filters?.maxPrice ?? filters?.priceRange?.max,
          excludeAirlines: filters?.excludeAirlines,
          includeAirlines: filters?.includeAirlines,
          excludeBasic: filters?.excludeBasic,
          emissions: filters?.emissions,
          outboundTimes: filters?.outboundTimes,
          returnTimes: filters?.returnTimes,
          bags: filters?.bags,
        excludeConns: filters?.excludeConns,
        maxDuration: filters?.maxDuration,
        currency: filters?.currency,
        gl: filters?.gl,
        hl: filters?.hl,
        }).catch(err => {
          console.error('SerpAPI flight search error:', err);
          return [] as any[];
        });

        // Launch RapidAPI flights in parallel (not just fallback - run always when configured)
        const rapidApiPromise = this.searchService.searchFlightsRapidApi(flightParams).catch(err => {
          console.error('RapidAPI flight search error:', err);
          return [] as any[];
        });

        // Launch MCP travel search in parallel
        const mcpTravelPromise = (async () => {
          try {
            const activeServers = await this.mcpService.listAvailableServers();
            if (activeServers.length === 0) {
              console.log(`⚠️  No active MCP servers for travel search`);
              return [] as CreateProductDTO[];
            }
            console.log(`🔌 Querying ${activeServers.length} MCP server(s) for travel: ${activeServers.map(s => s.name).join(', ')}`);
            return await this.mcpService.searchProducts(request.query, undefined, travelParams);
          } catch (error) {
            console.error('MCP travel search error:', error);
            return [] as CreateProductDTO[];
          }
        })();

        const [serpApiResults, rapidApiResults, mcpTravelProducts] = await Promise.all([
          serpApiPromise,
          rapidApiPromise,
          mcpTravelPromise,
        ]);

        // Convert SerpAPI flight results to CreateProductDTO
        const serpApiFlightProducts: CreateProductDTO[] = serpApiResults.map((result: any) => ({
          userId,
          name: result.title,
          description: result.snippet,
          price: typeof result.price === 'number' ? result.price : undefined,
          currency: result.currency || 'USD',
          imageUrl: result.image || undefined,
          productUrl: result.url,
          source: `serpapi_flights:${result.displayUrl || 'google_flights'}`,
          rawData: result.rawData,
          aiExtracted: false,
          searchQueryId: searchQuery.id,
        } as CreateProductDTO)).filter((p: CreateProductDTO) => p.name && p.name.trim());

        // Set userId/searchQueryId on MCP results
        const mcpWithIds = mcpTravelProducts.map(p => ({
          ...p,
          userId,
          searchQueryId: searchQuery.id,
        }));

        // Convert RapidAPI results to CreateProductDTO
        const rapidApiProducts: CreateProductDTO[] = rapidApiResults.map((result: any) => {
            const price = typeof result.price === 'number' ? result.price
              : typeof result.price === 'string' ? parseFloat(result.price.replace(/[^0-9.]/g, '')) : undefined;
            return {
              userId,
              name: result.title,
              description: result.snippet,
              price: !isNaN(price as number) ? price : undefined,
              currency: result.currency || 'USD',
              imageUrl: result.image || undefined,
              productUrl: result.url,
              source: `rapidapi_flights:${result.displayUrl || 'sky_scrapper'}`,
              rawData: result.rawData,
              aiExtracted: false,
              searchQueryId: searchQuery.id,
            } as CreateProductDTO;
          }).filter((p: CreateProductDTO) => p.name && p.name.trim());

        console.log(`✈️  SerpAPI: ${serpApiFlightProducts.length}, RapidAPI: ${rapidApiProducts.length}, MCP: ${mcpWithIds.length}`);

        // Combine and deduplicate (handle empty productUrls from MCP travel results)
        const allTravelProducts = [...serpApiFlightProducts, ...mcpWithIds, ...rapidApiProducts];
        const seen = new Set<string>();
        const uniqueTravelProducts = allTravelProducts.filter(p => {
          // For products with a real URL, deduplicate by URL
          if (p.productUrl && p.productUrl.trim()) {
            if (seen.has(p.productUrl)) return false;
            seen.add(p.productUrl);
            return true;
          }
          // For products without URL (MCP travel), deduplicate by name
          const key = `name:${p.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Apply price filters
        let filteredTravelProducts = uniqueTravelProducts;
        if (request.filters?.priceRange) {
          if (request.filters.priceRange.min != null) {
            filteredTravelProducts = filteredTravelProducts.filter(p =>
              p.price != null && p.price >= request.filters!.priceRange!.min!
            );
          }
          if (request.filters.priceRange.max != null) {
            filteredTravelProducts = filteredTravelProducts.filter(p => {
              if (p.price == null) return true;
              return p.price <= request.filters!.priceRange!.max!;
            });
          }
        }

        // Sort by price
        filteredTravelProducts.sort((a, b) => {
          const priceA = a.price ?? Infinity;
          const priceB = b.price ?? Infinity;
          return priceA - priceB;
        });

        // Save to database
        const savedProducts = await this.productRepository.bulkCreate(filteredTravelProducts);

        await this.searchQueryRepository.complete(searchQuery.id, savedProducts.length);
        const processingTimeMs = Date.now() - startTime;
        console.log(`✅ Combined travel search complete! Found ${savedProducts.length} results in ${processingTimeMs}ms`);

        const sourcesUsed = ['serpapi_flights'];
        if (mcpTravelProducts.length > 0) {
          const mcpSources = mcpTravelProducts.map(p => p.source).filter((s, i, arr) => arr.indexOf(s) === i);
          sourcesUsed.push(...mcpSources);
        }

        return {
          searchQueryId: searchQuery.id,
          products: savedProducts,
          filters: [],
          metadata: {
            totalResults: savedProducts.length,
            processingTimeMs,
            aiTokensUsed: 0,
            sourcesUsed,
          },
        };
      }

      const useShopping = isProduct && !isTravel;

      console.log(`🔍 Searching ${useShopping ? 'Google Shopping' : 'web'} for: "${request.query}"`);
      searchResults = await this.searchService.search(request.query, {
        maxResults: request.filters?.maxResults || 10,
        useShopping: useShopping,
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

      // Step 2: Filter shoppable products using AI (skip for Google Shopping as results are already products)
      let shoppableResults: any[] = [];
      
      if (useShopping) {
        // Google Shopping results are already products, use them directly
        shoppableResults = searchResults.map(result => ({
          ...result,
          isShoppable: true,
          confidence: 90,
          reasoning: 'Google Shopping result',
        }));
        console.log(`✅ Found ${shoppableResults.length} products from Google Shopping`);
      } else {
        // For regular search (travel, etc.), filter with AI
        console.log(`🤖 Filtering ${searchResults.length} results with AI...`);
        const filteredResults = await this.aiService.filterShoppableProducts(searchResults, isTravel);
        shoppableResults = filteredResults.filter(r => r.isShoppable && r.confidence > 50);
        console.log(`✅ Found ${shoppableResults.length} shoppable results`);
      }

      // Step 3: Fetch from MCP servers in parallel
      console.log(`🔌 Fetching from MCP servers...`);
      let mcpProducts: CreateProductDTO[] = [];
      try {
        // Check if any MCP servers are active
        const activeServers = await this.mcpService.listAvailableServers();
        if (activeServers.length === 0) {
          console.log(`⚠️  No active MCP servers configured. To enable MCP servers, run: pnpm seed:mcp-servers`);
        } else {
          console.log(`🔌 Querying ${activeServers.length} active MCP server(s): ${activeServers.map(s => s.name).join(', ')}`);
          mcpProducts = await this.mcpService.searchProducts(request.query, undefined, travelParams);
          console.log(`✅ Found ${mcpProducts.length} products from MCP servers`);
        }
      } catch (error) {
        console.error('MCP search failed:', error);
        // Continue without MCP results
      }

      // Step 4: Extract product data
      let extractedProducts: CreateProductDTO[] = [];
      
      if (useShopping) {
        // Google Shopping results already have price, image, etc. - extract directly
        console.log(`📦 Extracting product data from ${shoppableResults.length} Google Shopping results...`);
        extractedProducts = shoppableResults.map((result) => {
          // Use robust price extraction utility
          const extractedPrice = extractPriceFromGoogleShoppingResult(result);
          
          let price: number | undefined = extractedPrice?.value ?? undefined;
          const currency = extractedPrice?.currency || result.currency || 'USD';
          
          // Log price extraction details for debugging
          if (!price) {
            console.log(`⚠️  No price found for product: ${result.title.substring(0, 50)}...`);
            console.log(`   Price sources checked: result.price=${result.price}, rawData=${!!result.rawData}, snippet=${!!result.snippet}`);
          } else if (extractedPrice?.confidence === 'low') {
            console.log(`⚠️  Low confidence price extracted: "${extractedPrice.original}" -> ${price} for product: ${result.title.substring(0, 50)}...`);
          }
          
          // Validate price range (log warnings but don't reject)
          if (price != null) {
            if (price < 0.01) {
              console.warn(`⚠️  Suspiciously low price: ${price} for product: ${result.title.substring(0, 50)}...`);
              // Set to undefined if too low (likely parsing error)
              if (price < 0.01) {
                price = undefined;
              }
            } else if (price > 1000000) {
              console.warn(`⚠️  Very high price: ${price} for product: ${result.title.substring(0, 50)}...`);
              // Keep it but flag as potentially incorrect
            }
          }

          return {
            userId,
            name: result.title,
            description: result.snippet,
            price: price,
            currency: currency,
            imageUrl: result.image || undefined,
            productUrl: result.url,
            source: `google_shopping:${result.displayUrl}`,
            rawData: {
              availability: result.availability,
              distance: result.distance,
              storeLocation: result.storeLocation,
              originalPrice: extractedPrice?.original || result.price, // Store original price string for debugging
              priceCurrency: currency,
              priceConfidence: extractedPrice?.confidence || 'unknown',
              priceExtractionMethod: extractedPrice ? 'robust_extractor' : 'legacy',
            },
            aiExtracted: false, // From Google Shopping, not AI extracted
            searchQueryId: searchQuery.id,
          } as CreateProductDTO;
        }).filter(p => p.name && p.name.trim()); // Filter out products without names
      } else {
        // For non-shopping results, extract using AI
        console.log(`📦 Extracting ${isTravel ? 'travel' : 'product'} data from ${shoppableResults.length} URLs...`);
        const extractionPromises = shoppableResults.slice(0, 10).map(async (result) => {
          try {
            const html = await this.searchService.fetchPageContent(result.url);
            const productData = isTravel
              ? await this.aiService.extractTravelData(result.url, html)
              : await this.aiService.extractProductData(result.url, html);

            if (!productData) {
              return null;
            }

            // Skip products without required fields (name is required in database)
            if (!productData.name || !productData.name.trim()) {
              console.warn(`Skipping product with no name from ${result.url}`);
              return null;
            }

            // Normalize price using price extractor utility (handles edge cases)
            let normalizedPrice = productData.price;
            let normalizedCurrency = productData.currency || 'USD';
            
            if (productData.price != null) {
              // If price is a string, parse it
              if (typeof productData.price === 'string') {
                const parsed = parsePrice(productData.price, normalizedCurrency, 'medium');
                if (parsed.value != null) {
                  normalizedPrice = parsed.value;
                  normalizedCurrency = parsed.currency;
                } else {
                  console.warn(`Failed to parse AI-extracted price: "${productData.price}" from ${result.url}`);
                  normalizedPrice = undefined;
                }
              } else if (typeof productData.price === 'number') {
                // Validate numeric price
                if (productData.price < 0 || isNaN(productData.price)) {
                  console.warn(`Invalid AI-extracted price: ${productData.price} from ${result.url}`);
                  normalizedPrice = undefined;
                } else if (productData.price > 1000000) {
                  console.warn(`Suspiciously high AI-extracted price: ${productData.price} from ${result.url}`);
                }
              }
            }

            return {
              userId,
              name: productData.name,
              description: productData.description,
              price: normalizedPrice,
              currency: normalizedCurrency,
              imageUrl: productData.imageUrl,
              productUrl: result.url,
              source: `google_search:${result.displayUrl}`,
              rawData: {
                ...productData,
                originalPrice: productData.price, // Store original for debugging
                priceNormalized: true,
              },
              aiExtracted: true,
              searchQueryId: searchQuery.id,
            } as CreateProductDTO;
          } catch (error) {
            console.error(`Failed to extract from ${result.url}:`, error);
            return null;
          }
        });

        extractedProducts = (await Promise.all(extractionPromises)).filter(
          (p): p is CreateProductDTO => p !== null
        );
      }

      console.log(`✅ Successfully extracted ${extractedProducts.length} products`);

      // Step 5: Combine and deduplicate
      const allProductDTOs = [
        ...extractedProducts,
        ...mcpProducts.map(p => ({ ...p, userId, searchQueryId: searchQuery.id }))
      ];

      // Remove duplicates based on productUrl (or name for products without URLs)
      const seenKeys = new Set<string>();
      const uniqueProducts = allProductDTOs.filter(product => {
        const key = product.productUrl && product.productUrl.trim()
          ? product.productUrl
          : `name:${product.name}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // Step 6: Apply filters and sorting
      let filteredProducts = uniqueProducts;

      console.log(`🔍 Before filtering: ${filteredProducts.length} products`);
      if (request.filters?.priceRange) {
        console.log(`💰 Price filter: min=${request.filters.priceRange.min}, max=${request.filters.priceRange.max}`);
        // Log prices before filtering
        const pricesBefore = filteredProducts.map(p => ({ name: p.name, price: p.price }));
        console.log(`💰 Product prices before filter:`, pricesBefore.slice(0, 5));
      }

      // Apply price filters if provided
      if (request.filters?.priceRange) {
        const beforeCount = filteredProducts.length;
        if (request.filters.priceRange.min !== undefined && request.filters.priceRange.min != null) {
          filteredProducts = filteredProducts.filter(p => 
            p.price != null && p.price >= request.filters!.priceRange!.min!
          );
          console.log(`💰 After min price filter (>=${request.filters.priceRange.min}): ${filteredProducts.length} products (removed ${beforeCount - filteredProducts.length})`);
        }
        if (request.filters.priceRange.max !== undefined && request.filters.priceRange.max != null) {
          const beforeMaxCount = filteredProducts.length;
          filteredProducts = filteredProducts.filter(p => {
            // If product has no price, include it (user can see it and decide)
            // Only filter out if price is explicitly above max
            if (p.price == null) {
              return true; // Include products without prices
            }
            return p.price <= request.filters!.priceRange!.max!;
          });
          console.log(`💰 After max price filter (<=${request.filters.priceRange.max}): ${filteredProducts.length} products (removed ${beforeMaxCount - filteredProducts.length})`);
          
          // If all products were filtered out due to price, show top products anyway with a note
          if (filteredProducts.length === 0 && beforeMaxCount > 0) {
            console.log(`⚠️  All products exceed max price (${request.filters.priceRange.max}). Showing top 5 products anyway.`);
            // Sort by price and take the cheapest ones
            const sortedByPrice = uniqueProducts
              .filter(p => p.price != null)
              .sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
              .slice(0, 5);
            filteredProducts = sortedByPrice;
          }
        }
      }

      // Sort products based on criteria
      // For in-store: sort by distance (nearest first)
      // For online: sort by price (low to high)
      const preferLocalStores = (request.filters as any)?.preferLocalStores;
      const preferOnline = (request.filters as any)?.preferOnline;
      
      if (preferLocalStores && !preferOnline) {
        // In-store: sort by distance (if available in rawData)
        filteredProducts.sort((a, b) => {
          const distanceA = a.rawData?.distance ?? Infinity;
          const distanceB = b.rawData?.distance ?? Infinity;
          return distanceA - distanceB; // Nearest first
        });
        console.log(`📍 Sorted products by distance (nearest first)`);
      } else {
        // Online: sort by price (low to high)
        filteredProducts.sort((a, b) => {
          const priceA = a.price ?? Infinity;
          const priceB = b.price ?? Infinity;
          return priceA - priceB; // Low to high
        });
        console.log(`💰 Sorted products by price (low to high)`);
      }

      // Step 7: Save products to database
      console.log(`💾 Saving ${filteredProducts.length} products to database...`);
      
      if (filteredProducts.length === 0 && uniqueProducts.length > 0) {
        console.warn(`⚠️  All ${uniqueProducts.length} products were filtered out!`);
        console.warn(`   Price range filter:`, request.filters?.priceRange);
        console.warn(`   Sample product prices:`, uniqueProducts.slice(0, 5).map(p => ({ name: p.name, price: p.price })));
      }
      
      const savedProducts = await this.productRepository.bulkCreate(filteredProducts);

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

      const sourcesUsed = useShopping ? ['google_shopping'] : ['google_search'];
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
      ...(parsedQuery.isTravel && {
        origin: parsedQuery.origin,
        destination: parsedQuery.destination,
        startDate: parsedQuery.startDate ?? '(not specified)',
        endDate: parsedQuery.endDate ?? '(not specified)',
      }),
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
        preferLocalStores: parsedQuery.preferLocalStores,
        preferOnline: parsedQuery.preferOnline,
        isTravel: parsedQuery.isTravel,
        isProduct: parsedQuery.isProduct,
        // Pass flight-specific data for SerpAPI google_flights
        origin: parsedQuery.origin,
        destination: parsedQuery.destination,
        startDate: parsedQuery.startDate,
        endDate: parsedQuery.endDate,
        currency: parsedQuery.currency,
        // SerpAPI Google Flights optional params
        travelClass: parsedQuery.travelClass,
        adults: parsedQuery.adults,
        children: parsedQuery.children,
        infantsInSeat: parsedQuery.infantsInSeat,
        infantsOnLap: parsedQuery.infantsOnLap,
        stops: parsedQuery.stops,
        sortBy: parsedQuery.sortBy,
        deepSearch: parsedQuery.deepSearch,
        excludeAirlines: parsedQuery.excludeAirlines,
        includeAirlines: parsedQuery.includeAirlines,
        excludeBasic: parsedQuery.excludeBasic,
        emissions: parsedQuery.emissions,
        outboundTimes: parsedQuery.outboundTimes,
        returnTimes: parsedQuery.returnTimes,
        bags: parsedQuery.bags,
        excludeConns: parsedQuery.excludeConns,
        maxDuration: parsedQuery.maxDuration,
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
            agentId: 'default-shopping-agent',
            agentName: 'Shopping Assistant',
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
    let products: Product[] = [];

    // Normalize search query for matching
    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Find matching search queries for this user
    // Try to find an exact match or partial match
    const allUserQueries = await this.searchQueryRepository.findByUserId(userId, 100);

    // For travel queries with origin/destination, require route match — don't reuse cached
    // results from different routes just because keywords overlap (e.g. "Atlanta" matches both
    // "Atlanta to Newark" and "Atlanta to Miami").
    const isTravel = filters?.isTravel;
    const filterOrigin = filters?.origin?.toLowerCase();
    const filterDest = filters?.destination?.toLowerCase();

    // Find the best matching search query
    let matchingQuery: SearchQuery | null = null;
    let bestMatch = 0;

    for (const query of allUserQueries) {
      const queryText = query.queryText.toLowerCase();
      const queryMeta = query.metadata || {};

      // Exact match
      if (queryText === normalizedQuery) {
        matchingQuery = query;
        bestMatch = 100;
        break;
      }

      // For travel queries: require origin AND destination to match the cached query
      if (isTravel && filterOrigin && filterDest) {
        const cachedOrigin = queryMeta.origin?.toLowerCase();
        const cachedDest = queryMeta.destination?.toLowerCase();
        if (!cachedOrigin || !cachedDest) continue; // Skip non-travel cached queries
        if (cachedOrigin !== filterOrigin || cachedDest !== filterDest) continue; // Different route
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
          const queryMeta = query.metadata || {};

          // For travel queries: require route match in cached query metadata
          if (isTravel && filterOrigin && filterDest) {
            const cachedOrigin = queryMeta.origin?.toLowerCase();
            const cachedDest = queryMeta.destination?.toLowerCase();
            if (!cachedOrigin || !cachedDest) continue;
            if (cachedOrigin !== filterOrigin || cachedDest !== filterDest) continue;
          }

          if (queryText.includes(normalizedQuery) || normalizedQuery.includes(queryText)) {
            matchingQuery = query;
            break;
          }
        }
        if (matchingQuery) break;
      }
    }

    // If still no matching query found, try to find products by name/keywords from all demo users
    if (!matchingQuery) {
      console.log(`🔍 No matching search query found, trying keyword search for: "${normalizedQuery}"`);
      const { query } = await import('../config/database');
      
      // Extract keywords from search query - be more lenient
      // Remove common stop words and extract meaningful keywords
      const stopWords = ['find', 'search', 'show', 'me', 'buy', 'get', 'where', 'can', 'i', 'a', 'an', 'the', 'for', 'with', 'under', 'over', 'above', 'below', 'near', 'in', 'on', 'at', 'to', 'from', 'dollars', 'dollar', 'usd'];
      let keywords = normalizedQuery
        .split(/\s+/)
        .filter(word => {
          const cleaned = word.replace(/[^a-z0-9]/g, '');
          return cleaned.length > 2 && !stopWords.includes(cleaned.toLowerCase());
        })
        .map(word => word.replace(/[^a-z0-9]/g, ''))
        .filter(word => word.length > 2);
      
      // If no keywords after filtering, use the whole query (minus stop words)
      if (keywords.length === 0) {
        const allWords = normalizedQuery.split(/\s+/).filter(w => {
          const cleaned = w.replace(/[^a-z0-9]/g, '');
          return cleaned.length > 2 && !stopWords.includes(cleaned.toLowerCase());
        });
        keywords.push(...allWords.map(w => w.replace(/[^a-z0-9]/g, '')));
      }
      
      // If still no keywords, use the normalized query itself (for single word searches like "chair")
      if (keywords.length === 0 && normalizedQuery.length > 2) {
        const cleaned = normalizedQuery.replace(/[^a-z0-9]/g, '');
        if (cleaned.length > 2 && !stopWords.includes(cleaned)) {
          keywords = [cleaned];
        }
      }
      
      console.log(`🔑 Extracted keywords from "${normalizedQuery}":`, keywords);
      
      // Try to find products by name from any demo user
      if (keywords.length > 0) {
        // Find all demo users including the main demo user
        const mainDemoUserId = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
        const demoUserEmails = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
        const demoUsersResult = await query(
          `SELECT id FROM users WHERE email = ANY($1) OR id = $2`,
          [demoUserEmails, mainDemoUserId]
        );
        
        const demoUserIds = demoUsersResult.rows.map(row => row.id);
        
        // Build SQL query with proper parameterization
        // Use a single condition that matches ANY keyword (OR logic)
        const keywordConditions: string[] = [];
        const queryParams: any[] = [demoUserIds];
        let paramIndex = 2;
        
        // Create conditions for each keyword - match if ANY keyword matches
        for (const keyword of keywords) {
          keywordConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
          queryParams.push(`%${keyword}%`);
          paramIndex++;
        }
        
        const limitParam = paramIndex;
        queryParams.push(10); // LIMIT parameter
        
        console.log(`🔍 Searching products with keywords:`, keywords);
        console.log(`🔍 SQL conditions:`, keywordConditions);
        console.log(`🔍 Demo user IDs:`, demoUserIds);
        
        // Search for products with matching keywords
        // Use LEFT JOIN to include products even without search_query_id
        // Match if ANY keyword is found in name or description
        const productsResult = await query(
          `SELECT DISTINCT p.*, COALESCE(sq.id, NULL) as search_query_id
           FROM products p
           LEFT JOIN search_queries sq ON p.search_query_id = sq.id
           WHERE p.user_id = ANY($1)
             AND (${keywordConditions.join(' OR ')})
           ORDER BY p.created_at DESC
           LIMIT $${limitParam}`,
          queryParams
        );
        
        console.log(`🔍 Keyword search found ${productsResult.rows.length} products`);
        
        if (productsResult.rows.length > 0) {
          // Found products by keyword search - create a search query and link these products
          const searchQueryRecord = await this.searchQueryRepository.create({
            userId,
            queryText: searchQuery,
            metadata: { ...filters, matchedByKeywords: true },
          });
          
          // Map products to the expected format
          products = productsResult.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            searchQueryId: row.search_query_id || searchQueryRecord.id,
            name: row.name,
            description: row.description || null,
            price: row.price ? parseFloat(row.price) : undefined,
            currency: row.currency || 'USD',
            imageUrl: row.image_url || null,
            productUrl: row.product_url || null,
            source: row.source || null,
            rawData: row.raw_data ? (typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data) : null,
            aiExtracted: row.ai_extracted !== undefined ? row.ai_extracted : true,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          } as Product));
          
          await this.searchQueryRepository.complete(searchQueryRecord.id, products.length);
          
          console.log(`✅ Found ${products.length} demo products by keyword search for: "${searchQuery}"`);
          
          // Apply price filters if provided
          if (filters?.priceRange) {
            if (filters.priceRange.min !== undefined) {
              const minPrice = filters.priceRange.min;
              products = products.filter(p => p.price != null && p.price >= minPrice);
            }
            if (filters.priceRange.max !== undefined) {
              const maxPrice = filters.priceRange.max;
              products = products.filter(p => p.price != null && p.price <= maxPrice);
            }
          }
          
          // Limit results
          const maxResults = filters?.maxResults || 10;
          products = products.slice(0, maxResults);
          
          return {
            searchQueryId: searchQueryRecord.id,
            products,
            filters: [],
            metadata: {
              totalResults: products.length,
              processingTimeMs: Date.now() - startTime,
              aiTokensUsed: 0,
              sourcesUsed: ['demo_data'],
            },
          };
        }
      }
      
      // If still no products found, create a new search query and return empty results
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
    products = await this.productRepository.findBySearchQueryId(matchingQuery.id);
    
    // If matching query has no products, we already tried keyword search above, so return empty
    if (products.length === 0) {
      console.log(`⚠️  Matching query found but has 0 products`);
      // Create search query record and return empty results
      const searchQueryRecord = await this.searchQueryRepository.create({
        userId,
        queryText: searchQuery,
        metadata: { ...filters, matchedDemoQuery: matchingQuery.id, sourceUserId: matchingQuery.userId },
      });
      
      await this.searchQueryRepository.complete(searchQueryRecord.id, 0);
      
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
    } else {
      // Apply price filters if provided
      if (filters?.priceRange) {
        if (filters.priceRange.min !== undefined) {
          const minPrice = filters.priceRange.min;
          products = products.filter(p => p.price != null && p.price >= minPrice);
        }
        if (filters.priceRange.max !== undefined) {
          const maxPrice = filters.priceRange.max;
          products = products.filter(p => p.price != null && p.price <= maxPrice);
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
        },
      };
    }
  }
}
