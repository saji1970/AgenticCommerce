import axios from 'axios';
import { SearchResult, SearchOptions } from '@agentic-commerce/shared-types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { extractPriceFromGoogleShoppingResult } from '../utils/price-extractor';

export class SearchService {
  private googleApiKey: string;
  private searchEngineId: string;
  private serpApiKey: string;
  private rapidApiKey: string;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  constructor() {
    this.googleApiKey = config.googleSearch.apiKey;
    this.searchEngineId = config.googleSearch.searchEngineId;
    this.serpApiKey = config.serpApi.apiKey;
    this.rapidApiKey = config.rapidApi.key;

    if (this.serpApiKey) {
      console.log('✅ SerpAPI configured as primary search provider');
    }
    if (this.rapidApiKey) {
      console.log(`✅ RapidAPI configured as flight search fallback (host: ${config.rapidApi.host})`);
    }
    if (!this.serpApiKey && this.googleApiKey && this.searchEngineId) {
      console.log('✅ Google Custom Search configured as search provider');
    }
    if (!this.serpApiKey && !(this.googleApiKey && this.searchEngineId)) {
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
   * Supports all SerpAPI Google Flights parameters.
   */
  async searchFlights(params: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    query: string;
    // SerpAPI Google Flights optional params
    travelClass?: 'economy' | 'premium_economy' | 'business' | 'first';
    adults?: number;
    children?: number;
    infantsInSeat?: number;
    infantsOnLap?: number;
    stops?: 0 | 1 | 2 | 3;
    sortBy?: 1 | 2 | 3 | 4 | 5 | 6;
    deepSearch?: boolean;
    maxPrice?: number;
    excludeAirlines?: string;
    includeAirlines?: string;
    excludeBasic?: boolean;
    emissions?: boolean;
    outboundTimes?: string;
    returnTimes?: string;
    bags?: number;
    excludeConns?: string;
    maxDuration?: number;
    currency?: string;
    gl?: string;
    hl?: string;
  }): Promise<SearchResult[]> {
    if (!this.serpApiKey) {
      console.log('⚠️  SerpAPI not configured, cannot search flights directly');
      return [];
    }

    try {
      const travelClassMap: Record<string, string> = {
        economy: '1',
        premium_economy: '2',
        business: '3',
        first: '4',
      };

      const apiParams: any = {
        api_key: this.serpApiKey,
        engine: 'google_flights',
        hl: params.hl ?? 'en',
        gl: params.gl ?? 'us',
        currency: params.currency ?? 'USD',
        type: params.returnDate ? '1' : '2', // 1=round trip, 2=one way
      };

      // Map city names to airport codes if needed
      if (params.origin) {
        apiParams.departure_id = this.resolveAirportCode(params.origin);
      }
      if (params.destination) {
        apiParams.arrival_id = this.resolveAirportCode(params.destination);
      }
      // SerpAPI requires outbound_date - default to today if not provided or past
      const today = new Date().toISOString().split('T')[0];
      apiParams.outbound_date = (params.departureDate && params.departureDate >= today)
        ? params.departureDate
        : today;
      if (params.departureDate && params.departureDate < today) {
        console.log(`⚠️  Adjusted past departure date ${params.departureDate} → ${apiParams.outbound_date}`);
      }
      if (params.returnDate) {
        const depart = apiParams.outbound_date || today;
        apiParams.return_date = params.returnDate < depart ? depart : params.returnDate;
      }

      // Optional SerpAPI params
      if (params.travelClass && travelClassMap[params.travelClass]) {
        apiParams.travel_class = travelClassMap[params.travelClass];
      }
      if (params.adults != null) apiParams.adults = params.adults;
      if (params.children != null) apiParams.children = params.children;
      if (params.infantsInSeat != null) apiParams.infants_in_seat = params.infantsInSeat;
      if (params.infantsOnLap != null) apiParams.infants_on_lap = params.infantsOnLap;
      if (params.stops != null) apiParams.stops = params.stops;
      if (params.sortBy != null) apiParams.sort_by = params.sortBy;
      if (params.deepSearch === true) apiParams.deep_search = true;
      if (params.maxPrice != null) apiParams.max_price = params.maxPrice;
      if (params.excludeAirlines) apiParams.exclude_airlines = params.excludeAirlines;
      if (params.includeAirlines) apiParams.include_airlines = params.includeAirlines;
      if (params.excludeBasic === true) apiParams.exclude_basic = true;
      if (params.emissions === true) apiParams.emissions = 1;
      if (params.outboundTimes) apiParams.outbound_times = params.outboundTimes;
      if (params.returnTimes) apiParams.return_times = params.returnTimes;
      if (params.bags != null) apiParams.bags = params.bags;
      if (params.excludeConns) apiParams.exclude_conns = params.excludeConns;
      if (params.maxDuration != null) apiParams.max_duration = params.maxDuration;

      console.log(`✈️  SerpAPI Flights search:`, {
        from: apiParams.departure_id,
        to: apiParams.arrival_id,
        depart: apiParams.outbound_date,
        return: apiParams.return_date,
        type: params.returnDate ? 'round-trip' : 'one-way',
        ...(params.stops != null && { stops: params.stops }),
        ...(params.sortBy != null && { sortBy: params.sortBy }),
        ...(params.maxPrice != null && { maxPrice: params.maxPrice }),
        ...(params.deepSearch && { deepSearch: true }),
      });

      // SerpAPI Google Flights API: https://serpapi.com/search?engine=google_flights
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

  /**
   * Search flights via RapidAPI Sky Scrapper - used as fallback when SerpAPI returns nothing.
   */
  async searchFlightsRapidApi(params: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    query: string;
  }): Promise<SearchResult[]> {
    if (!this.rapidApiKey || !params.origin || !params.destination) {
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const date = (params.departureDate && params.departureDate >= today) ? params.departureDate : today;

    const rapidHost = config.rapidApi.host;

    try {
      const headers = {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': rapidHost,
      };

      // Resolve origin - /api/v1/flights/searchAirport
      const originRes = await axios.get(
        `https://${rapidHost}/api/v1/flights/searchAirport`,
        { headers, params: { query: params.origin, locale: 'en-US' }, timeout: 10000 }
      );
      const originPlaces = originRes.data?.data;
      if (!Array.isArray(originPlaces) || originPlaces.length === 0) {
        console.log(`⚠️  RapidAPI: could not resolve origin "${params.origin}"`);
        return [];
      }
      const originEntity = originPlaces[0];

      // Resolve destination
      const destRes = await axios.get(
        `https://${rapidHost}/api/v1/flights/searchAirport`,
        { headers, params: { query: params.destination, locale: 'en-US' }, timeout: 10000 }
      );
      const destPlaces = destRes.data?.data;
      if (!Array.isArray(destPlaces) || destPlaces.length === 0) {
        console.log(`⚠️  RapidAPI: could not resolve destination "${params.destination}"`);
        return [];
      }
      const destEntity = destPlaces[0];

      // Search flights
      const flightParams: Record<string, any> = {
        originSkyId: originEntity.skyId,
        destinationSkyId: destEntity.skyId,
        originEntityId: originEntity.entityId,
        destinationEntityId: destEntity.entityId,
        date,
        cabinClass: 'economy',
        adults: 1,
        currency: 'USD',
        market: 'en-US',
        countryCode: 'US',
      };
      if (params.returnDate && params.returnDate >= date) {
        flightParams.returnDate = params.returnDate;
      }

      const { data } = await axios.get(
        `https://${rapidHost}/api/v2/flights/searchFlightsWebComplete`,
        { headers, params: flightParams, timeout: 30000 }
      );

      const itineraries = data?.data?.itineraries ?? [];
      if (itineraries.length === 0) {
        console.log('⚠️  RapidAPI returned 0 flight results');
        return [];
      }

      console.log(`✅ RapidAPI returned ${itineraries.length} flight results`);

      return itineraries.slice(0, 10).map((it: any) => {
        const leg = it.legs?.[0];
        const airline = leg?.carriers?.marketing?.[0]?.name ?? 'Unknown';
        const airlineLogo = leg?.carriers?.marketing?.[0]?.logoUrl;
        const originCode = leg?.origin?.displayCode || params.origin;
        const destCode = leg?.destination?.displayCode || params.destination;
        const duration = leg?.durationInMinutes ? `${Math.floor(leg.durationInMinutes / 60)}h ${leg.durationInMinutes % 60}m` : '';
        const stops = leg?.stopCount ?? 0;
        const stopText = stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`;

        return {
          title: `${airline} - ${originCode} to ${destCode}`,
          url: 'https://www.google.com/travel/flights',
          snippet: `${stopText} · ${duration} · Departs ${leg?.departure || ''}, Arrives ${leg?.arrival || ''}`.trim(),
          displayUrl: airline,
          price: it.price?.raw ?? (typeof it.price?.formatted === 'string' ? parseFloat(it.price.formatted.replace(/[^0-9.]/g, '')) : null),
          currency: 'USD',
          availability: 'Available',
          image: airlineLogo || null,
          rawData: it,
        } as SearchResult & { rawData?: any };
      });
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('RapidAPI Flights error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      } else {
        console.error('RapidAPI Flights unexpected error:', error);
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

    // Common city to airport code mapping (expand as needed)
    const cityMap: Record<string, string> = {
      'atlanta': 'ATL', 'chennai': 'MAA', 'madras': 'MAA', 'new york': 'JFK', 'nyc': 'JFK',
      'los angeles': 'LAX', 'la': 'LAX', 'chicago': 'ORD', 'dallas': 'DFW', 'denver': 'DEN',
      'san francisco': 'SFO', 'sf': 'SFO', 'seattle': 'SEA', 'miami': 'MIA', 'boston': 'BOS',
      'washington': 'IAD', 'dc': 'IAD', 'houston': 'IAH', 'phoenix': 'PHX', 'las vegas': 'LAS',
      'orlando': 'MCO', 'london': 'LHR', 'paris': 'CDG', 'tokyo': 'NRT', 'dubai': 'DXB',
      'singapore': 'SIN', 'hong kong': 'HKG', 'mumbai': 'BOM', 'delhi': 'DEL', 'new delhi': 'DEL',
      'bangalore': 'BLR', 'bengaluru': 'BLR', 'hyderabad': 'HYD', 'kolkata': 'CCU', 'pune': 'PNQ',
      'sydney': 'SYD', 'toronto': 'YYZ', 'frankfurt': 'FRA', 'amsterdam': 'AMS',
      'bangkok': 'BKK', 'kuala lumpur': 'KUL', 'doha': 'DOH', 'istanbul': 'IST',
      'rome': 'FCO', 'madrid': 'MAD', 'barcelona': 'BCN', 'munich': 'MUC', 'zurich': 'ZRH',
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
