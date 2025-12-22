import axios, { AxiosInstance } from 'axios';
import { Product, SearchFilters } from '@agentic-commerce/shared';

export interface MCPServerConfig {
  url: string;
  retailer: string;
  apiKey?: string;
}

export class MCPClient {
  private servers: Map<string, AxiosInstance> = new Map();

  constructor(configs: MCPServerConfig[]) {
    configs.forEach((config) => {
      const client = axios.create({
        baseURL: config.url,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
        },
      });
      this.servers.set(config.retailer, client);
    });
  }

  async searchProducts(filters: SearchFilters): Promise<Product[]> {
    const results: Product[] = [];
    const searchPromises: Promise<any>[] = [];

    // Query all configured MCP servers in parallel
    this.servers.forEach((client, retailer) => {
      const promise = client
        .post('/products/search', filters)
        .then((response) => {
          return response.data.products.map((product: any) => ({
            ...product,
            retailer: {
              ...product.retailer,
              id: retailer,
              name: retailer,
            },
          }));
        })
        .catch((error) => {
          console.error(`Error fetching from ${retailer}:`, error.message);
          return [];
        });
      searchPromises.push(promise);
    });

    const allResults = await Promise.all(searchPromises);
    allResults.forEach((products) => results.push(...products));

    return results;
  }

  async getProductDetails(productId: string, retailer: string): Promise<Product | null> {
    const client = this.servers.get(retailer);
    if (!client) {
      throw new Error(`No MCP server configured for retailer: ${retailer}`);
    }

    try {
      const response = await client.get(`/products/${productId}`);
      return response.data.product;
    } catch (error) {
      console.error(`Error fetching product details from ${retailer}:`, error);
      return null;
    }
  }

  async checkAvailability(productId: string, retailer: string): Promise<boolean> {
    const client = this.servers.get(retailer);
    if (!client) return false;

    try {
      const response = await client.get(`/products/${productId}/availability`);
      return response.data.inStock;
    } catch (error) {
      console.error(`Error checking availability from ${retailer}:`, error);
      return false;
    }
  }

  async getPriceHistory(productId: string, retailer: string, days: number = 30) {
    const client = this.servers.get(retailer);
    if (!client) return [];

    try {
      const response = await client.get(`/products/${productId}/price-history`, {
        params: { days },
      });
      return response.data.history;
    } catch (error) {
      console.error(`Error fetching price history from ${retailer}:`, error);
      return [];
    }
  }

  getAvailableRetailers(): string[] {
    return Array.from(this.servers.keys());
  }
}

export default MCPClient;
