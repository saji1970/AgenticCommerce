import { Product, SearchFilters } from '@agentic-commerce/shared';

export interface IProductSearchProvider {
  readonly name: string;
  searchProducts(filters: SearchFilters): Promise<Product[]>;
  getProductDetails?(productId: string, retailer: string): Promise<Product | null>;
}
