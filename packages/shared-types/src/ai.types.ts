export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
}

export interface FilteredResult extends SearchResult {
  isShoppable: boolean;
  confidence: number;
  reasoning: string;
}

export interface ExtractedProductData {
  name: string;
  price?: number;
  currency?: string;
  description?: string;
  imageUrl?: string;
  specifications?: Record<string, any>;
  availability?: string;
  rating?: number;
  reviewCount?: number;
  brand?: string;
  category?: string;
}

export interface AIProcessingLog {
  id: string;
  searchQueryId?: string;
  operationType: 'filter' | 'extract' | 'curate' | 'generate_filters';
  modelUsed: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  costEstimate?: number;
  metadata?: any;
  createdAt: Date;
}

export interface CreateAIProcessingLogDTO {
  searchQueryId?: string;
  operationType: 'filter' | 'extract' | 'curate' | 'generate_filters';
  modelUsed: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  costEstimate?: number;
  metadata?: any;
}

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  country?: string;
  safeSearch?: boolean;
}

export interface MCPSearchResult {
  name: string;
  url: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
  source: string;
  metadata?: any;
}
