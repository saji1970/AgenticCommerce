import { apiService } from './api';

export interface ProductSearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
  availability?: 'all' | 'online' | 'instore';
  minRating?: number;
  stores?: string[];
}

class ProductService {
  async searchProducts(filters: ProductSearchFilters): Promise<any[]> {
    return await apiService.post('/products/search', filters);
  }

  async getProductDetails(productId: string): Promise<any> {
    return await apiService.get(`/products/${productId}`);
  }

  async getNearbyStores(productId: string, latitude: number, longitude: number): Promise<any[]> {
    return await apiService.get(`/products/${productId}/nearby-stores`, {
      params: { latitude, longitude },
    });
  }
}

export const productService = new ProductService();
