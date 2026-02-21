import axios from 'axios';
import { SearchResult, SearchOptions } from '@agentic-commerce/shared-types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { extractPriceFromGoogleShoppingResult } from '../utils/price-extractor';

export class SearchService {
  private googleApiKey: string;
  private searchEngineId: string;
  private serpApiKey: string;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  constructor() {
    this.googleApiKey = config.googleSearch.apiKey;
    this.searchEngineId = config.googleSearch.searchEngineId;
    this.serpApiKey = config.serpApi.apiKey;

    if (this.serpApiKey) {
      console.log('✅ SerpAPI configured as primary search provider');
    } else if (this.googleApiKey && this.searchEngineId) {
      console.log('✅ Google Custom Search configured as search provider');
    } else {
      console.warn('⚠️  No search API credentials configured (set SERPAPI_KEY or GOOGLE_API_KEY + GOOGLE_SEARCH_ENGINE_ID)');
    }
  }

  async search(query: string, options?: SearchOptions & { useShopping?: boolean }): Promise<SearchResult[]> {
    this.checkRateLimit();

    // Try SerpAPI first, then fall back to Google Custom Search
    if (this.serpApiKey) {
      return this.searchWithSerpApi(query, options);
    }

    if (this.googleApiKey && this.searchEngineId) {
      return this.searchWithGoogle(query, options);
    }

    throw new AppError(
      503,
      'No search API configured. Please set SERPAPI_KEY or GOOGLE_API_KEY + GOOGLE_SEARCH_ENGINE_ID',
      'SEARCH_NOT_CONFIGURED'
    );
  }

  private async searchWithSerpApi(query: string, options?: SearchOptions & { useShopping?: boolean }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults || 10;
    const country = options?.country || 'us';
    const useShopping = options?.useShopping ?? false;

    try {
      const params: any = {
        api_key: this.serpApiKey,
        q: query,
        num: Math.min(maxResults, 10),
        gl: country,
        hl: options?.language || 'en',
      };

      if (useShopping) {
        params.engine = 'google_shopping';
      } else {
        params.engine = 'google';
      }

      console.log(`🔍 SerpAPI ${useShopping ? 'Shopping' : 'Search'} for: "${query}"`);

      const response = await axios.get('https://serpapi.com/search.json', {
        params,
        timeout: 30000,
      });

      this.requestCount++;

      if (useShopping) {
        return this.mapSerpApiShoppingResults(response.data);
      } else {
        return this.mapSerpApiSearchResults(response.data);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new AppError(429, 'SerpAPI rate limit exceeded', 'RATE_LIMIT_ERROR');
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new AppError(503, 'SerpAPI authentication failed. Check your SERPAPI_KEY.', 'SEARCH_AUTH_ERROR');
        }
        console.error('SerpAPI error:', {
          query,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw new AppError(503, `SerpAPI error: ${error.response?.data?.error || error.message}`, 'SEARCH_SERVICE_ERROR');
      }
      console.error('Unexpected SerpAPI error:', error);
      throw error;
    }
  }

  private mapSerpApiShoppingResults(data: any): SearchResult[] {
    const results = data.shopping_results || [];
    if (results.length === 0) {
      console.log('⚠️  SerpAPI returned 0 shopping results');
      return [];
    }

    console.log(`✅ SerpAPI returned ${results.length} shopping results`);

    return results.map((item: any) => ({
      title: item.title || '',
      url: item.link || item.product_link || '',
      snippet: item.snippet || item.source || '',
      displayUrl: item.source || '',
      price: item.extracted_price ?? item.price ?? null,
      currency: item.currency || 'USD',
      availability: item.delivery ? 'In Stock' : undefined,
      image: item.thumbnail || null,
      rawData: item,
    }));
  }

  private mapSerpApiSearchResults(data: any): SearchResult[] {
    const results = data.organic_results || [];
    if (results.length === 0) {
      console.log('⚠️  SerpAPI returned 0 organic results');
      return [];
    }

    console.log(`✅ SerpAPI returned ${results.length} organic results`);

    return results.map((item: any) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      displayUrl: item.displayed_link || item.source || '',
      price: null,
      currency: 'USD',
      image: item.thumbnail || null,
      rawData: item,
    }));
  }

  private async searchWithGoogle(query: string, options?: SearchOptions & { useShopping?: boolean }): Promise<SearchResult[]> {
    const maxResults = options?.maxResults || 10;
    const language = options?.language || 'en';
    const country = options?.country || 'us';
    const useShopping = options?.useShopping ?? false;

    try {
      const params: any = {
        key: this.googleApiKey,
        cx: this.searchEngineId,
        q: query,
        num: Math.min(maxResults, 10),
        lr: `lang_${language}`,
        gl: country,
        safe: options?.safeSearch ? 'active' : 'off',
      };

      if (useShopping) {
        params.tbm = 'shop';
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params,
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      this.requestCount++;

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      return response.data.items.map((item: any) => {
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
          price: extractedPrice?.value != null ? extractedPrice.original : null,
          currency: extractedPrice?.currency || result.currency,
          availability: item.pagemap?.offer?.[0]?.availability,
          image: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.imageobject?.[0]?.url,
          rawData: item.pagemap,
          _priceMetadata: extractedPrice ? {
            value: extractedPrice.value,
            confidence: extractedPrice.confidence,
          } : null,
        };
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new AppError(429, 'Google Search API rate limit exceeded', 'RATE_LIMIT_ERROR');
        }
        if (error.response?.status === 403) {
          throw new AppError(503, 'Google Search API authentication failed. Check your API key.', 'SEARCH_AUTH_ERROR');
        }
        if (error.response?.status === 502) {
          throw new AppError(502, 'Google Search API is temporarily unavailable (Bad Gateway).', 'SEARCH_SERVICE_UNAVAILABLE');
        }
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new AppError(503, 'Google Search API request timed out.', 'SEARCH_TIMEOUT');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new AppError(503, 'Cannot connect to Google Search API.', 'SEARCH_CONNECTION_ERROR');
        }
        console.error('Google Search API error:', {
          query,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw new AppError(503, `Google Search API error: ${error.response?.statusText || error.message}`, 'SEARCH_SERVICE_ERROR');
      }
      console.error('Unexpected error in SearchService:', error);
      throw error;
    }
  }

  /**
   * Search for flights using SerpAPI's google_flights engine.
   * Returns structured flight data as SearchResult[].
   */
  async searchFlights(params: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    query: string;
  }): Promise<SearchResult[]> {
    if (!this.serpApiKey) {
      console.log('⚠️  SerpAPI not configured, cannot search flights directly');
      return [];
    }

    try {
      const apiParams: any = {
        api_key: this.serpApiKey,
        engine: 'google_flights',
        hl: 'en',
        gl: 'us',
        currency: 'USD',
        type: params.returnDate ? '1' : '2', // 1=round trip, 2=one way
      };

      // Map city names to airport codes if needed
      if (params.origin) {
        apiParams.departure_id = this.resolveAirportCode(params.origin);
      }
      if (params.destination) {
        apiParams.arrival_id = this.resolveAirportCode(params.destination);
      }
      if (params.departureDate) {
        apiParams.outbound_date = params.departureDate;
      }
      if (params.returnDate) {
        apiParams.return_date = params.returnDate;
      }

      console.log(`✈️  SerpAPI Flights search:`, {
        from: apiParams.departure_id,
        to: apiParams.arrival_id,
        depart: apiParams.outbound_date,
        return: apiParams.return_date,
        type: params.returnDate ? 'round-trip' : 'one-way',
      });

      const response = await axios.get('https://serpapi.com/search.json', {
        params: apiParams,
        timeout: 30000,
      });

      this.requestCount++;

      return this.mapFlightResults(response.data, params);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('SerpAPI Flights error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      } else {
        console.error('SerpAPI Flights unexpected error:', error);
      }
      return [];
    }
  }

  private mapFlightResults(data: any, params: any): SearchResult[] {
    // SerpAPI returns best_flights and other_flights arrays
    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    if (allFlights.length === 0) {
      console.log('⚠️  SerpAPI returned 0 flight results');
      return [];
    }

    console.log(`✅ SerpAPI returned ${allFlights.length} flight results (${bestFlights.length} best, ${otherFlights.length} other)`);

    return allFlights.slice(0, 10).map((flight: any) => {
      const legs = flight.flights || [];
      const firstLeg = legs[0] || {};
      const airline = firstLeg.airline || 'Unknown Airline';
      const flightNo = firstLeg.flight_number || '';
      const departure = firstLeg.departure_airport?.name || params.origin || '';
      const arrival = legs[legs.length - 1]?.arrival_airport?.name || params.destination || '';
      const departTime = firstLeg.departure_airport?.time || '';
      const arriveTime = legs[legs.length - 1]?.arrival_airport?.time || '';
      const duration = flight.total_duration ? `${Math.floor(flight.total_duration / 60)}h ${flight.total_duration % 60}m` : '';
      const stops = legs.length - 1;
      const stopText = stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`;

      const title = `${airline} ${flightNo} - ${departure} to ${arrival}`.trim();
      const snippet = `${stopText} · ${duration} · Departs ${departTime}, Arrives ${arriveTime}`;

      return {
        title,
        url: data.search_metadata?.google_flights_url || `https://www.google.com/travel/flights`,
        snippet,
        displayUrl: airline,
        price: flight.price ?? null,
        currency: 'USD',
        availability: 'Available',
        image: firstLeg.airline_logo || null,
        rawData: flight,
      };
    });
  }

  private resolveAirportCode(cityOrCode: string): string {
    // If already looks like an airport code (2-4 uppercase letters), use as-is
    if (/^[A-Z]{2,4}$/.test(cityOrCode.toUpperCase()) && cityOrCode.length <= 4) {
      return cityOrCode.toUpperCase();
    }

    // Common city to airport code mapping
    const cityMap: Record<string, string> = {
      'atlanta': 'ATL', 'chennai': 'MAA', 'new york': 'JFK', 'los angeles': 'LAX',
      'chicago': 'ORD', 'dallas': 'DFW', 'denver': 'DEN', 'san francisco': 'SFO',
      'seattle': 'SEA', 'miami': 'MIA', 'boston': 'BOS', 'washington': 'IAD',
      'houston': 'IAH', 'phoenix': 'PHX', 'las vegas': 'LAS', 'orlando': 'MCO',
      'london': 'LHR', 'paris': 'CDG', 'tokyo': 'NRT', 'dubai': 'DXB',
      'singapore': 'SIN', 'hong kong': 'HKG', 'mumbai': 'BOM', 'delhi': 'DEL',
      'bangalore': 'BLR', 'hyderabad': 'HYD', 'kolkata': 'CCU', 'pune': 'PNQ',
      'sydney': 'SYD', 'toronto': 'YYZ', 'frankfurt': 'FRA', 'amsterdam': 'AMS',
      'bangkok': 'BKK', 'kuala lumpur': 'KUL', 'doha': 'DOH',
    };

    return cityMap[cityOrCode.toLowerCase()] || cityOrCode.toUpperCase();
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
