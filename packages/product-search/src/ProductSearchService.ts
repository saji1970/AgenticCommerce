import { Product, SearchFilters } from '@agentic-commerce/shared';
import { IProductSearchProvider } from './interfaces/IProductSearch';
import { RapidAPIProvider } from './providers/RapidAPIProvider';
import { SerpAPIProvider } from './providers/SerpAPIProvider';

export type ProductSearchSource = 'rapidapi' | 'serpapi' | 'mcp' | 'mock';

export interface ProductSearchConfig {
  source: ProductSearchSource;
  apiKey?: string;
  mcpServerUrls?: string[];
}

// Mock provider for development/testing when no API key is available
class MockProductSearchProvider implements IProductSearchProvider {
  readonly name = 'mock';

  async searchProducts(filters: SearchFilters): Promise<Product[]> {
    console.warn('MockProductSearchProvider: No API key configured, returning empty results');
    return [];
  }
}

export class ProductSearchService {
  private provider: IProductSearchProvider;

  constructor(config: ProductSearchConfig) {
    switch (config.source) {
      case 'rapidapi':
        if (!config.apiKey) {
          console.warn('RapidAPI key not provided, using mock provider');
          this.provider = new MockProductSearchProvider();
        } else {
          this.provider = new RapidAPIProvider({ apiKey: config.apiKey });
        }
        break;

      case 'serpapi':
        if (!config.apiKey) {
          console.warn('SerpAPI key not provided, using mock provider');
          this.provider = new MockProductSearchProvider();
        } else {
          this.provider = new SerpAPIProvider({ apiKey: config.apiKey });
        }
        break;

      case 'mcp':
        // MCP provider loaded from @agentic-commerce/mcp-client
        throw new Error('MCP provider should be initialized separately via @agentic-commerce/mcp-client');

      case 'mock':
        this.provider = new MockProductSearchProvider();
        break;

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
