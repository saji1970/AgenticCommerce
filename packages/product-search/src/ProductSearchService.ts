import { Product, SearchFilters } from '@agentic-commerce/shared';
import { IProductSearchProvider } from './interfaces/IProductSearch';
import { RapidAPIProvider } from './providers/RapidAPIProvider';
import { SerpAPIProvider } from './providers/SerpAPIProvider';

export type ProductSearchSource = 'rapidapi' | 'serpapi' | 'mcp';

export interface ProductSearchConfig {
  source: ProductSearchSource;
  apiKey?: string;
  mcpServerUrls?: string[];
}

export class ProductSearchService {
  private provider: IProductSearchProvider;

  constructor(config: ProductSearchConfig) {
    switch (config.source) {
      case 'rapidapi':
        if (!config.apiKey) {
          throw new Error('RapidAPI key required for rapidapi source');
        }
        this.provider = new RapidAPIProvider({ apiKey: config.apiKey });
        break;

      case 'serpapi':
        if (!config.apiKey) {
          throw new Error('SerpAPI key required for serpapi source');
        }
        this.provider = new SerpAPIProvider({ apiKey: config.apiKey });
        break;

      case 'mcp':
        // MCP provider loaded from @agentic-commerce/mcp-client
        throw new Error('MCP provider should be initialized separately via @agentic-commerce/mcp-client');

      default:
        throw new Error(`Unsupported product search source: ${config.source}`);
    }
  }

  async searchProducts(filters: SearchFilters): Promise<Product[]> {
    return await this.provider.searchProducts(filters);
  }

  getProviderName(): string {
    return this.provider.name;
  }
}

export default ProductSearchService;
