import axios from 'axios';
import { SearchResult, SearchOptions } from '@agentic-commerce/shared-types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { extractPriceFromGoogleShoppingResult } from '../utils/price-extractor';

export class SearchService {
  private apiKey: string;
  private searchEngineId: string;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  constructor() {
    this.apiKey = config.googleSearch.apiKey;
    this.searchEngineId = config.googleSearch.searchEngineId;

    if (!this.apiKey || !this.searchEngineId) {
      console.warn('⚠️  Google Search API credentials not configured');
    }
  }

  async search(query: string, options?: SearchOptions & { useShopping?: boolean }): Promise<SearchResult[]> {
    this.checkRateLimit();

    if (!this.apiKey || !this.searchEngineId) {
      throw new AppError(
        503,
        'Google Search API not configured. Please set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID',
        'SEARCH_NOT_CONFIGURED'
      );
    }

    const maxResults = options?.maxResults || 10;
    const language = options?.language || 'en';
    const country = options?.country || 'us';
    const useShopping = options?.useShopping ?? false; // Use Google Shopping for products

    try {
      const params: any = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: Math.min(maxResults, 10), // Google API max is 10 per request
        lr: `lang_${language}`,
        gl: country,
        safe: options?.safeSearch ? 'active' : 'off',
      };

      // Add Google Shopping parameter for product searches
      if (useShopping) {
        params.tbm = 'shop'; // Google Shopping search
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params,
        timeout: 30000, // Increased timeout to 30s to prevent premature failures
        validateStatus: (status) => status < 500, // Don't throw on 4xx, only 5xx
      });

      this.requestCount++;

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      return response.data.items.map((item: any) => {
        // Use robust price extraction utility
        const result = {
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          displayUrl: item.displayLink || new URL(item.link).hostname,
          rawData: item.pagemap,
          price: item.pagemap?.offer?.[0]?.price,
          currency: item.pagemap?.offer?.[0]?.pricecurrency || 
                   item.pagemap?.product?.[0]?.offers?.pricecurrency ||
                   'USD',
        };

        const extractedPrice = extractPriceFromGoogleShoppingResult(result);
        
        return {
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          displayUrl: item.displayLink || new URL(item.link).hostname,
          // Google Shopping specific fields
          price: extractedPrice?.value != null ? extractedPrice.original : null,
          currency: extractedPrice?.currency || result.currency,
          availability: item.pagemap?.offer?.[0]?.availability,
          image: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.imageobject?.[0]?.url,
          // Store full pagemap for debugging
          rawData: item.pagemap,
          // Store extracted price metadata for better processing downstream
          _priceMetadata: extractedPrice ? {
            value: extractedPrice.value,
            confidence: extractedPrice.confidence,
          } : null,
        };
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle specific HTTP status codes
        if (error.response?.status === 429) {
          throw new AppError(429, 'Google Search API rate limit exceeded', 'RATE_LIMIT_ERROR');
        }
        if (error.response?.status === 403) {
          throw new AppError(
            503,
            'Google Search API authentication failed. Check your API key.',
            'SEARCH_AUTH_ERROR'
          );
        }
        // Handle 502 Bad Gateway specifically
        if (error.response?.status === 502) {
          console.error('Google Search API returned 502 Bad Gateway:', {
            query,
            url: error.config?.url,
            status: error.response.status,
            statusText: error.response.statusText,
          });
          throw new AppError(
            502,
            'Google Search API is temporarily unavailable (Bad Gateway). Please try again later.',
            'SEARCH_SERVICE_UNAVAILABLE'
          );
        }
        // Handle network errors (timeouts, connection issues)
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.error('Google Search API request timeout:', {
            query,
            timeout: error.config?.timeout,
            code: error.code,
          });
          throw new AppError(
            503,
            'Google Search API request timed out. Please try again.',
            'SEARCH_TIMEOUT'
          );
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.error('Google Search API connection error:', {
            query,
            code: error.code,
            message: error.message,
          });
          throw new AppError(
            503,
            'Cannot connect to Google Search API. Please check your internet connection.',
            'SEARCH_CONNECTION_ERROR'
          );
        }
        // Log full error details for debugging
        console.error('Google Search API error:', {
          query,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code,
        });
        throw new AppError(
          503,
          `Google Search API error: ${error.response?.statusText || error.message}`,
          'SEARCH_SERVICE_ERROR'
        );
      }
      // Non-Axios errors
      console.error('Unexpected error in SearchService:', error);
      throw error;
    }
  }

  async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxContentLength: 5 * 1024 * 1024, // 5MB max
      });

      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch content from ${url}:`, error.message);
      throw new AppError(500, `Failed to fetch webpage: ${error.message}`, 'FETCH_ERROR');
    }
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    // Reset counter every minute
    if (timeSinceReset > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
      return;
    }

    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new AppError(
        429,
        'Rate limit exceeded. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  getRateLimitStatus(): { requests: number; max: number; resetsIn: number } {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const resetsIn = Math.max(0, 60000 - timeSinceReset);

    return {
      requests: this.requestCount,
      max: this.MAX_REQUESTS_PER_MINUTE,
      resetsIn,
    };
  }
}
