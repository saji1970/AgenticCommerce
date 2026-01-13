import React, { createContext, useState, ReactNode } from 'react';
import {
  AISearchRequest,
  AISearchResponse,
  Product,
  ProductFilters,
  PaginatedProducts,
  SearchQuery,
  ProductFilter,
} from '@agentic-commerce/shared-types';
import { productService } from '../services/product.service';

interface ProductContextType {
  // State
  products: Product[];
  loading: boolean;
  error: string | null;
  searchHistory: SearchQuery[];
  filters: ProductFilter[];
  currentSearchQueryId: string | null;
  paginationInfo: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  } | null;

  // Methods
  performAISearch: (request: AISearchRequest) => Promise<AISearchResponse>;
  performNLPSearch: (naturalLanguageQuery: string, createMandate?: boolean) => Promise<{
    searchResponse: AISearchResponse;
    parsedQuery: any;
    intentCreated?: any;
    mandateCreated?: any;
  }>;
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  refreshProducts: () => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getSearchHistory: () => Promise<void>;
  clearError: () => void;
  clearProducts: () => void;
}

export const ProductContext = createContext<ProductContextType>({} as ProductContextType);

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([]);
  const [filters, setFilters] = useState<ProductFilter[]>([]);
  const [currentSearchQueryId, setCurrentSearchQueryId] = useState<string | null>(null);
  const [paginationInfo, setPaginationInfo] = useState<{
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  } | null>(null);
  const [currentFilters, setCurrentFilters] = useState<ProductFilters | undefined>(undefined);

  const performAISearch = async (request: AISearchRequest): Promise<AISearchResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await productService.aiSearch(request);

      setProducts(response.products);
      setFilters(response.filters);
      setCurrentSearchQueryId(response.searchQueryId);
      setPaginationInfo({
        total: response.metadata.totalResults,
        page: 1,
        limit: response.products.length,
        hasMore: false,
      });

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to perform AI search';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const performNLPSearch = async (naturalLanguageQuery: string, createMandate: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await productService.nlpSearch(naturalLanguageQuery, createMandate);

      // Update products and filters from search response
      setProducts(result.searchResponse.products);
      setFilters(result.searchResponse.filters);
      setCurrentSearchQueryId(result.searchResponse.searchQueryId);
      setPaginationInfo({
        total: result.searchResponse.metadata.totalResults,
        page: 1,
        limit: result.searchResponse.products.length,
        hasMore: false,
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to perform NLP search';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (filters?: ProductFilters) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentFilters(filters);

      const response: PaginatedProducts = await productService.getProducts(filters);

      setProducts(response.products);
      setPaginationInfo({
        total: response.total,
        page: response.page,
        limit: response.limit,
        hasMore: response.hasMore,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch products';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProducts = async () => {
    if (currentFilters !== undefined) {
      await fetchProducts(currentFilters);
    } else {
      await fetchProducts();
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      await productService.deleteProduct(id);

      // Remove from local state
      setProducts(prevProducts => prevProducts.filter(p => p.id !== id));

      // Update pagination total
      if (paginationInfo) {
        setPaginationInfo({
          ...paginationInfo,
          total: paginationInfo.total - 1,
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete product';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSearchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const history = await productService.getSearchHistory(10);
      setSearchHistory(history);
    } catch (err: any) {
      // Don't set error state for authentication issues
      // This is expected when user is not logged in
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch search history';
        setError(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clearProducts = () => {
    setProducts([]);
    setFilters([]);
    setCurrentSearchQueryId(null);
    setPaginationInfo(null);
    setCurrentFilters(undefined);
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        error,
        searchHistory,
        filters,
        currentSearchQueryId,
        paginationInfo,
        performAISearch,
        performNLPSearch,
        fetchProducts,
        refreshProducts,
        deleteProduct,
        getSearchHistory,
        clearError,
        clearProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};
