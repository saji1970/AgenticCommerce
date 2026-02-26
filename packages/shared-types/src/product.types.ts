export interface Product {
  id: string;
  userId: string;
  name: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  source: string;
  rawData?: any;
  aiExtracted: boolean;
  searchQueryId?: string; // Link to the search that found this product
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDTO {
  userId: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  productUrl: string;
  source: string;
  rawData?: any;
  aiExtracted?: boolean;
  searchQueryId?: string; // Link to the search that found this product
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  productUrl?: string;
}

export interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  source?: string;
  search?: string;
  sortBy?: 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchQuery {
  id: string;
  userId: string;
  queryText: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultsCount: number;
  errorMessage?: string;
  metadata?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateSearchQueryDTO {
  userId: string;
  queryText: string;
  metadata?: any;
}

export interface ProductFilter {
  id: string;
  searchQueryId: string;
  filterType: string;
  filterLabel: string;
  filterValue: any;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateProductFilterDTO {
  searchQueryId: string;
  filterType: string;
  filterLabel: string;
  filterValue: any;
  isActive?: boolean;
}

export interface AISearchRequest {
  query: string;
  filters?: {
    maxResults?: number;
    priceRange?: {
      min?: number;
      max?: number;
    };
    sources?: string[];
    // Travel / flight filters
    isTravel?: boolean;
    isProduct?: boolean;
    productType?: string; // 'flight' | 'hotel' | etc.
    origin?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelClass?: string;
    adults?: number;
    children?: number;
    infantsInSeat?: number;
    infantsOnLap?: number;
    stops?: number | string;
    sortBy?: number | string;
    deepSearch?: boolean;
    maxPrice?: number;
    excludeAirlines?: string;
    includeAirlines?: string;
    excludeBasic?: boolean;
    emissions?: boolean | string;
    outboundTimes?: any;
    returnTimes?: any;
    bags?: number;
    excludeConns?: string;
    maxDuration?: number;
    currency?: string;
    gl?: string;
    hl?: string;
    preferLocalStores?: boolean;
    preferOnline?: boolean;
    // Pagination
    page?: number;
    limit?: number;
  };
}

export interface AISearchResponse {
  searchQueryId: string;
  products: Product[];
  filters: ProductFilter[];
  metadata: {
    totalResults: number;
    processingTimeMs: number;
    aiTokensUsed: number;
    sourcesUsed: string[];
  };
}

export interface MCPServerConfig {
  id: string;
  name: string;
  serverType: string;
  endpointUrl: string;
  config: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMCPServerConfigDTO {
  name: string;
  serverType: string;
  endpointUrl: string;
  config: any;
  isActive?: boolean;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
