import { apiService } from './api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  retailer?: string;
  category?: string;
}

interface SearchParams {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  retailer?: string;
}

class ProductService {
  async search(params: SearchParams): Promise<Product[]> {
    return await apiService.post<Product[]>('/products/search', params);
  }

  async getProduct(id: string): Promise<Product> {
    return await apiService.get<Product>(`/products/${id}`);
  }

  async getProducts(): Promise<Product[]> {
    return await apiService.get<Product[]>('/products');
  }
}

export const productService = new ProductService();

