import axios, { AxiosInstance } from 'axios';
import { Product, SearchFilters } from '@agentic-commerce/shared';
import { IProductSearchProvider } from '../interfaces/IProductSearch';

export interface RapidAPIConfig {
  apiKey: string;
  host?: string;
}

export class RapidAPIProvider implements IProductSearchProvider {
  readonly name = 'rapidapi';
  private client: AxiosInstance;

  constructor(config: RapidAPIConfig) {
    this.client = axios.create({
      baseURL: 'https://real-time-product-search.p.rapidapi.com',
      headers: {
        'X-RapidAPI-Key': config.apiKey,
        'X-RapidAPI-Host': config.host || 'real-time-product-search.p.rapidapi.com',
      },
      timeout: 10000,
    });
  }

  async searchProducts(filters: SearchFilters): Promise<Product[]> {
    try {
      const params: any = {
        q: filters.query || '',
        country: 'us',
      };

      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;

      const response = await this.client.get('/search', { params });

      return (response.data.data || []).map((item: any) => this.mapToProduct(item));
    } catch (error: any) {
      console.error('RapidAPI search error:', error.message);
      return [];
    }
  }

  private mapToProduct(item: any): Product {
    return {
      id: item.product_id || `rapidapi_${Date.now()}_${Math.random()}`,
      externalId: item.product_id,
      name: item.product_title,
      description: item.product_description || '',
      price: parseFloat(item.offer?.price || item.typical_price_range?.[0] || '0'),
      currency: 'USD',
      imageUrls: item.product_photos || [],
      retailer: {
        id: this.getRetailerId(item.source),
        name: item.source || 'Unknown',
        website: item.product_page_url || '',
        trustScore: 0,
        returnPolicy: '',
        shippingOptions: [],
      },
      category: item.product_category || 'General',
      specifications: {
        brand: item.product_brand,
        rating: item.product_rating,
        numReviews: item.product_num_reviews,
      },
      availability: {
        inStock: item.offer?.store_name ? true : false,
      },
      rating: parseFloat(item.product_rating || '0'),
      reviewCount: parseInt(item.product_num_reviews || '0'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getRetailerId(source: string): string {
    const sourceMap: Record<string, string> = {
      'Amazon.com': 'amazon',
      'Walmart': 'walmart',
      'Target': 'target',
      'Best Buy': 'bestbuy',
      'eBay': 'ebay',
    };
    return sourceMap[source] || source.toLowerCase().replace(/\s+/g, '_');
  }
}
