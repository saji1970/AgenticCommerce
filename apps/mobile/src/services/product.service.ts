import {
  AISearchRequest,
  AISearchResponse,
  Product,
  ProductFilters,
  PaginatedProducts,
  SearchQuery,
} from '@agentic-commerce/shared-types';
import { apiClient } from './api';

export const productService = {
  async aiSearch(request: AISearchRequest): Promise<AISearchResponse> {
    return apiClient.post<AISearchResponse>('/products/ai-search', request);
  },

  async getProducts(filters?: ProductFilters): Promise<PaginatedProducts> {
    const params = new URLSearchParams();

    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.source) params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/products?${queryString}` : '/products';

    return apiClient.get<PaginatedProducts>(url);
  },

  async getProductById(id: string): Promise<Product> {
    return apiClient.get<Product>(`/products/${id}`);
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async getSearchHistory(limit: number = 10): Promise<SearchQuery[]> {
    return apiClient.get<SearchQuery[]>(`/products/search-history?limit=${limit}`);
  },

  async getSearchQueryById(id: string): Promise<{ query: SearchQuery; products: Product[] }> {
    return apiClient.get<{ query: SearchQuery; products: Product[] }>(`/products/search-history/${id}`);
  },
};
