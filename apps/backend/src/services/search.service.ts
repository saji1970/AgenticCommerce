import axios from 'axios';
import { SearchResult, SearchOptions } from '@agentic-commerce/shared-types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

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

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
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

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: Math.min(maxResults, 10), // Google API max is 10 per request
          lr: `lang_${language}`,
          gl: country,
          safe: options?.safeSearch ? 'active' : 'off',
        },
        timeout: 10000,
      });

      this.requestCount++;

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      return response.data.items.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet || '',
        displayUrl: item.displayLink || new URL(item.link).hostname,
      }));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
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
        throw new AppError(
          503,
          `Google Search API error: ${error.message}`,
          'SEARCH_SERVICE_ERROR'
        );
      }
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
