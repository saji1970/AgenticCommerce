import axios, { AxiosInstance } from 'axios';
import { Product, SearchFilters } from '@agentic-commerce/shared';
import { IProductSearchProvider } from '../interfaces/IProductSearch';

export interface SerpAPIConfig {
  apiKey: string;
}

export class SerpAPIProvider implements IProductSearchProvider {
  readonly name = 'serpapi';
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: SerpAPIConfig) {
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: 'https://serpapi.com',
      timeout: 10000,
    });
  }

  async searchProducts(filters: SearchFilters): Promise<Product[]> {
    try {
      const params: any = {
        engine: 'google_shopping',
        q: filters.query || '',
        api_key: this.apiKey,
        location: 'United States',
      };

      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;

      const response = await this.client.get('/search', { params });

      return (response.data.shopping_results || []).map((item: any) =>
        this.mapToProduct(item)
      );
    } catch (error: any) {
      console.error('SerpAPI search error:', error.message);
      return [];
    }
  }

  private mapToProduct(item: any): Product {
    return {
      id: item.product_id || `serpapi_${Date.now()}_${Math.random()}`,
      externalId: item.product_id,
      name: item.title,
      description: item.snippet || '',
      price: parseFloat(item.extracted_price || item.price || '0'),
      currency: 'USD',
      imageUrls: item.thumbnail ? [item.thumbnail] : [],
      retailer: {
        id: this.getRetailerId(item.source),
        name: item.source || 'Unknown',
        website: item.link || '',
        trustScore: 0,
        returnPolicy: '',
        shippingOptions: item.shipping
          ? [
              {
                id: 'default',
                name: item.shipping,
                cost: 0,
                estimatedDays: 7,
              },
            ]
          : [],
      },
      category: 'General',
      specifications: {
        rating: item.rating,
        numReviews: item.reviews,
      },
      availability: {
        inStock: true,
      },
      rating: parseFloat(item.rating || '0'),
      reviewCount: parseInt(item.reviews || '0'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getRetailerId(source: string): string {
    return source.toLowerCase().replace(/\s+/g, '_');
  }
}
