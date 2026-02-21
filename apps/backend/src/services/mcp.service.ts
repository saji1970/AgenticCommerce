import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateProductDTO, MCPServerConfig } from '@agentic-commerce/shared-types';
import { MCPServerConfigRepository } from '../repositories/mcp-config.repository';
import { AppError } from '../middleware/errorHandler';

export interface TravelSearchParams {
  origin?: string;
  destination?: string;
  date?: string;        // departure date
  returnDate?: string;
  checkin?: string;     // hotel checkin
  checkout?: string;    // hotel checkout
  productType?: string; // 'flight' | 'hotel' | 'travel'
  isTravel: boolean;
}

interface MCPClientInstance {
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
}

export class MCPService {
  private clients: Map<string, MCPClientInstance> = new Map();
  private configRepository: MCPServerConfigRepository;

  constructor() {
    this.configRepository = new MCPServerConfigRepository();
  }

  async connectToServer(serverName: string): Promise<void> {
    if (this.clients.has(serverName)) {
      return; // Already connected
    }

    const config = await this.configRepository.findByName(serverName);
    if (!config || !config.isActive) {
      throw new AppError(
        404,
        `MCP server '${serverName}' not found or inactive`,
        'MCP_SERVER_NOT_FOUND'
      );
    }

    try {
      const transport = new StdioClientTransport({
        command: config.config.command,
        args: config.config.args || [],
        env: { ...process.env, ...config.config.env },
      });

      const client = new Client({
        name: 'agentic-commerce-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      await client.connect(transport);

      this.clients.set(serverName, { client, transport, config });
      console.log(`✅ Connected to MCP server: ${serverName}`);
    } catch (error: any) {
      console.error(`Failed to connect to MCP server '${serverName}':`, error);
      throw new AppError(
        500,
        `Failed to connect to MCP server: ${error.message}`,
        'MCP_CONNECTION_ERROR'
      );
    }
  }

  async searchProducts(query: string, serverName?: string, travelParams?: TravelSearchParams): Promise<CreateProductDTO[]> {
    const servers = serverName
      ? [serverName]
      : Array.from(this.clients.keys());

    if (servers.length === 0) {
      // Try to connect to all active servers
      const activeServers = await this.configRepository.findAllActive();
      for (const server of activeServers) {
        try {
          await this.connectToServer(server.name);
        } catch (error) {
          console.error(`Failed to connect to ${server.name}:`, error);
        }
      }
    }

    // Re-read servers after potential connections
    const activeServers = servers.length > 0 ? servers : Array.from(this.clients.keys());

    const results = await Promise.allSettled(
      activeServers.map(name => this.searchOnServer(name, query, travelParams))
    );

    const products: CreateProductDTO[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        products.push(...result.value);
      } else {
        console.error(`MCP search failed on ${activeServers[index]}:`, result.reason);
      }
    });

    return products;
  }

  private async searchOnServer(serverName: string, query: string, travelParams?: TravelSearchParams): Promise<CreateProductDTO[]> {
    try {
      await this.connectToServer(serverName);

      const instance = this.clients.get(serverName);
      if (!instance) {
        return [];
      }

      // For rapidapi-travel with travel params, use specialized travel search
      if (serverName === 'rapidapi-travel' && travelParams?.isTravel) {
        return this.searchTravelServer(instance, query, travelParams);
      }

      const { client, config } = instance;

      // List available tools
      const tools = await client.listTools();

      // Get server-specific search tool name from config, or find it automatically
      const configuredSearchTool = config.config?.searchTool;
      let searchTool = configuredSearchTool
        ? tools.tools.find(t => t.name === configuredSearchTool)
        : null;

      // If not found in config, try common tool name patterns
      if (!searchTool) {
        // Server-specific tool name patterns
        const toolPatterns = this.getServerSpecificToolPatterns(serverName);

        for (const pattern of toolPatterns) {
          searchTool = tools.tools.find(t =>
            t.name.toLowerCase().includes(pattern.toLowerCase())
          );
          if (searchTool) break;
        }

        // Fallback to generic search patterns
        if (!searchTool) {
          searchTool = tools.tools.find(t =>
            t.name.toLowerCase().includes('search') ||
            t.name.toLowerCase().includes('query') ||
            t.name.toLowerCase().includes('product') ||
            t.name.toLowerCase().includes('item')
          );
        }
      }

      if (!searchTool) {
        console.warn(`No search tool found on server '${serverName}'. Available tools:`,
          tools.tools.map(t => t.name).join(', '));
        return [];
      }

      // Build tool arguments based on server type
      const toolArguments = this.buildToolArguments(serverName, query, searchTool);

      // Call the search tool
      const response = await client.callTool({
        name: searchTool.name,
        arguments: toolArguments,
      });

      // Parse and normalize response with server-specific handling
      return this.normalizeResponse(response, serverName);
    } catch (error: any) {
      console.error(`Search error on MCP server '${serverName}':`, error);
      return []; // Don't block other servers
    }
  }

  /**
   * Specialized travel search on rapidapi-travel MCP server.
   * Calls search_flights and/or search_hotels with structured params in parallel.
   */
  private async searchTravelServer(
    instance: MCPClientInstance,
    query: string,
    travelParams: TravelSearchParams
  ): Promise<CreateProductDTO[]> {
    const { client } = instance;
    const tools = await client.listTools();
    const toolNames = tools.tools.map(t => t.name);
    console.log(`✈️  MCP rapidapi-travel: available tools: ${toolNames.join(', ')}`);

    const calls: Promise<CreateProductDTO[]>[] = [];
    const queryLower = query.toLowerCase();

    // Determine which tools to call based on query intent
    const wantFlights = queryLower.includes('flight') || queryLower.includes('fly') ||
      queryLower.includes('airline') || travelParams.productType === 'flight' ||
      (travelParams.origin && travelParams.destination);
    const wantHotels = queryLower.includes('hotel') || queryLower.includes('stay') ||
      queryLower.includes('accommodation') || queryLower.includes('lodge') ||
      travelParams.productType === 'hotel' ||
      (travelParams.checkin && travelParams.checkout);

    // Search flights
    const flightTool = tools.tools.find(t => t.name.toLowerCase().includes('flight'));
    if (flightTool && wantFlights && travelParams.origin && travelParams.destination) {
      const flightArgs: Record<string, string> = {
        origin: travelParams.origin,
        destination: travelParams.destination,
      };
      if (travelParams.date) flightArgs.date = travelParams.date;
      if (travelParams.returnDate) flightArgs.returnDate = travelParams.returnDate;

      console.log(`✈️  MCP rapidapi-travel: calling ${flightTool.name} with`, flightArgs);
      calls.push(
        client.callTool({ name: flightTool.name, arguments: flightArgs })
          .then(response => this.normalizeResponse(response, 'rapidapi-travel'))
          .catch(err => {
            console.error(`✈️  MCP rapidapi-travel ${flightTool.name} error:`, err);
            return [] as CreateProductDTO[];
          })
      );
    }

    // Search hotels
    const hotelTool = tools.tools.find(t => t.name.toLowerCase().includes('hotel'));
    if (hotelTool && (wantHotels || (!wantFlights && travelParams.destination))) {
      const hotelArgs: Record<string, string> = {};
      if (travelParams.destination) hotelArgs.destination = travelParams.destination;
      if (travelParams.checkin) hotelArgs.checkin = travelParams.checkin;
      if (travelParams.checkout) hotelArgs.checkout = travelParams.checkout;
      // Fallback: use travel dates as checkin/checkout
      if (!hotelArgs.checkin && travelParams.date) hotelArgs.checkin = travelParams.date;
      if (!hotelArgs.checkout && travelParams.returnDate) hotelArgs.checkout = travelParams.returnDate;

      console.log(`🏨 MCP rapidapi-travel: calling ${hotelTool.name} with`, hotelArgs);
      calls.push(
        client.callTool({ name: hotelTool.name, arguments: hotelArgs })
          .then(response => this.normalizeResponse(response, 'rapidapi-travel'))
          .catch(err => {
            console.error(`🏨 MCP rapidapi-travel ${hotelTool.name} error:`, err);
            return [] as CreateProductDTO[];
          })
      );
    }

    if (calls.length === 0) {
      console.log(`⚠️  MCP rapidapi-travel: no matching tools for query "${query}" (want flights=${wantFlights}, want hotels=${wantHotels})`);
      return [];
    }

    const results = await Promise.allSettled(calls);
    const products: CreateProductDTO[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        products.push(...result.value);
      }
    }

    console.log(`✅ MCP rapidapi-travel: found ${products.length} travel results`);
    return products;
  }

  /**
   * Get server-specific tool name patterns for search
   */
  private getServerSpecificToolPatterns(serverName: string): string[] {
    const patterns: Record<string, string[]> = {
      'agora-mcp': ['search_products', 'search', 'query_products'],
      'shopify-catalog': ['query_products', 'search_products', 'products'],
      'bitrefill': ['search_products', 'search', 'products'],
      'mercadolibre': ['search_items', 'search', 'items'],
      'commercetools': ['search_products', 'products', 'query'],
      'shufersal': ['search_groceries', 'search', 'groceries'],
      'dynamics365-commerce': ['search_products', 'products', 'query'],
      'rapidapi-travel': ['search_flights', 'search_hotels'],
    };

    return patterns[serverName] || ['search', 'query', 'product'];
  }

  /**
   * Build tool arguments based on server type
   */
  private buildToolArguments(serverName: string, query: string, tool: any): any {
    const baseArgs: any = { query };

    // Server-specific argument patterns
    switch (serverName) {
      case 'agora-mcp':
        return {
          query,
          limit: 10,
          // Add filters if needed
        };
      
      case 'shopify-catalog':
        return {
          query,
          first: 10, // Shopify uses 'first' for pagination
        };
      
      case 'mercadolibre':
        return {
          q: query, // MercadoLibre uses 'q' parameter
          limit: 10,
        };
      
      case 'commercetools':
        return {
          text: query, // Commercetools uses 'text' for search
          limit: 10,
        };
      
      case 'shufersal':
        return {
          search: query,
          limit: 10,
        };

      case 'rapidapi-travel':
        // Parse travel-related parameters from the query
        return {
          query,
        };

      default:
        // Use tool's schema to determine arguments
        if (tool.inputSchema?.properties) {
          const args: any = {};
          const props = tool.inputSchema.properties;
          
          // Map common parameter names
          if (props.query) args.query = query;
          else if (props.q) args.q = query;
          else if (props.text) args.text = query;
          else if (props.search) args.search = query;
          else args.query = query; // Fallback
          
          return args;
        }
        
        return baseArgs;
    }
  }

  private normalizeResponse(response: any, source: string): CreateProductDTO[] {
    try {
      if (!response.content || response.content.length === 0) {
        return [];
      }

      const content = response.content[0];
      let data: any;

      if (typeof content === 'string') {
        data = JSON.parse(content);
      } else if (content.type === 'text') {
        data = JSON.parse(content.text);
      } else {
        data = content;
      }

      // Handle different response structures from different servers
      if (data.flights) {
        data = data.flights; // RapidAPI travel — flights
      } else if (data.hotels) {
        data = data.hotels; // RapidAPI travel — hotels
      } else if (data.products) {
        data = data.products; // Agora, Commercetools
      } else if (data.items) {
        data = data.items; // MercadoLibre
      } else if (data.edges) {
        // Shopify GraphQL response
        data = data.edges.map((edge: any) => edge.node);
      } else if (data.results) {
        data = data.results; // Generic results wrapper
      }

      if (!Array.isArray(data)) {
        data = [data];
      }

      return data.map((item: any) => {
        // Server-specific field mapping
        const normalized = this.normalizeProductItem(item, source);
        return {
          userId: '', // Will be set by ProductService
          name: normalized.name,
          description: normalized.description,
          price: normalized.price,
          currency: normalized.currency,
          imageUrl: normalized.imageUrl,
          productUrl: normalized.productUrl,
          source: `mcp:${source}`,
          rawData: item,
          aiExtracted: false,
        };
      });
    } catch (error: any) {
      console.error('Failed to normalize MCP response:', error);
      return [];
    }
  }

  /**
   * Normalize product item from different MCP server formats
   */
  private normalizeProductItem(item: any, source: string): {
    name: string;
    description?: string;
    price?: number;
    currency: string;
    imageUrl?: string;
    productUrl: string;
  } {
    // Server-specific field mappings
    switch (source) {
      case 'shopify-catalog':
        return {
          name: item.title || item.name || 'Unknown Product',
          description: item.description || item.bodyHtml,
          price: item.variants?.[0]?.price ? parseFloat(item.variants[0].price) : undefined,
          currency: item.variants?.[0]?.priceV2?.currencyCode || 'USD',
          imageUrl: item.featuredImage?.url || item.images?.[0]?.url,
          productUrl: item.onlineStoreUrl || item.url || '',
        };
      
      case 'mercadolibre':
        return {
          name: item.title || item.name || 'Unknown Product',
          description: item.description || item.subtitle,
          price: item.price ? parseFloat(item.price) : undefined,
          currency: item.currency_id || 'USD',
          imageUrl: item.thumbnail || item.pictures?.[0]?.url,
          productUrl: item.permalink || item.url || '',
        };
      
      case 'commercetools':
        return {
          name: item.name?.en || item.name || 'Unknown Product',
          description: item.description?.en || item.description,
          price: item.masterVariant?.prices?.[0]?.value?.centAmount 
            ? item.masterVariant.prices[0].value.centAmount / 100 
            : undefined,
          currency: item.masterVariant?.prices?.[0]?.value?.currencyCode || 'USD',
          imageUrl: item.masterVariant?.images?.[0]?.url,
          productUrl: item.url || '',
        };
      
      case 'agora-mcp':
        return {
          name: item.name || item.title || 'Unknown Product',
          description: item.description || item.snippet,
          price: item.price ? parseFloat(item.price) : undefined,
          currency: item.currency || 'USD',
          imageUrl: item.image_url || item.imageUrl || item.image,
          productUrl: item.url || item.link || item.product_url || '',
        };

      case 'rapidapi-travel':
        // Flights
        if (item.airline || item.departure) {
          const durationHrs = item.duration ? Math.floor(item.duration / 60) : undefined;
          const durationMin = item.duration ? item.duration % 60 : undefined;
          const durationStr = durationHrs != null ? `${durationHrs}h ${durationMin}m` : '';
          return {
            name: `${item.airline || 'Flight'} — ${item.origin} → ${item.destination}`,
            description: [
              durationStr && `Duration: ${durationStr}`,
              item.stops != null && `Stops: ${item.stops === 0 ? 'Non-stop' : item.stops}`,
              item.cabinClass && `Class: ${item.cabinClass}`,
              item.departure && `Departs: ${item.departure}`,
            ].filter(Boolean).join(' | '),
            price: item.priceRaw ?? (typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price),
            currency: 'USD',
            imageUrl: item.airlineLogo,
            productUrl: '',
          };
        }
        // Hotels
        return {
          name: item.name || 'Hotel',
          description: [
            item.rating && `${item.rating} stars`,
            item.reviewScore && `Review: ${item.reviewScore}`,
            item.location && `Location: ${item.location}`,
            item.checkin && item.checkout && `${item.checkin} → ${item.checkout}`,
          ].filter(Boolean).join(' | '),
          price: item.priceRaw ?? (typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price),
          currency: 'USD',
          imageUrl: item.imageUrl,
          productUrl: '',
        };

      default:
        // Generic mapping
        return {
          name: item.name || item.title || item.productName || 'Unknown Product',
          description: item.description || item.snippet || item.summary,
          price: item.price 
            ? (typeof item.price === 'string' ? parseFloat(item.price) : item.price)
            : undefined,
          currency: item.currency || item.currencyCode || 'USD',
          imageUrl: item.image_url || item.imageUrl || item.image || item.thumbnail,
          productUrl: item.url || item.link || item.product_url || item.permalink || '',
        };
    }
  }

  async listAvailableServers(): Promise<MCPServerConfig[]> {
    return this.configRepository.findAllActive();
  }

  async disconnect(serverName: string): Promise<void> {
    const instance = this.clients.get(serverName);
    if (instance) {
      try {
        await instance.client.close();
        console.log(`Disconnected from MCP server: ${serverName}`);
      } catch (error) {
        console.error(`Error disconnecting from ${serverName}:`, error);
      }
      this.clients.delete(serverName);
    }
  }

  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    await Promise.all(serverNames.map(name => this.disconnect(name)));
  }

  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.clients.forEach((_, name) => {
      status[name] = true;
    });
    return status;
  }
}
