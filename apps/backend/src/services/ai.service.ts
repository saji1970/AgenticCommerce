import Anthropic from '@anthropic-ai/sdk';
import {
  SearchResult,
  FilteredResult,
  ExtractedProductData,
  Product,
  CreateProductFilterDTO,
} from '@agentic-commerce/shared-types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

/**
 * Store information from nearby store search
 */
export interface NearbyStore {
  name: string;
  address: string;
  distance: string;
  rating?: number;
  isOpen?: boolean;
  phone?: string;
  priceLevel?: string;
  placeId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Product offer/deal information
 */
export interface ProductOffer {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  promoCode?: string;
  dealType: 'sale' | 'clearance' | 'coupon' | 'bundle' | 'limited_time';
  expiresAt?: string;
  terms?: string;
}

/**
 * Enhanced product data with offers and store info
 */
export interface EnhancedProductData extends ExtractedProductData {
  offers?: ProductOffer[];
  nearbyStores?: NearbyStore[];
  bestPrice?: {
    price: number;
    store: string;
    url: string;
  };
}

export class AIService {
  private anthropic: Anthropic;
  private modelName: string;

  constructor() {
    if (!config.anthropic.apiKey) {
      console.warn('Anthropic API key not configured');
    }

    this.anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
    this.modelName = config.anthropic.model;

    console.log(`AI Service initialized with Anthropic Claude model: ${this.modelName}`);
  }

  /**
   * Strip markdown code fences from response
   */
  private stripMarkdownCodeFences(text: string): string {
    let cleaned = text.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    return cleaned.trim();
  }

  /**
   * Extract JSON from text that might contain other content
   */
  private extractJSON(text: string): string {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return objectMatch[0];
    }

    return text;
  }

  /**
   * Fix common JSON issues
   */
  private fixJSON(jsonString: string): string {
    let fixed = jsonString;
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    return fixed;
  }

  /**
   * Safely parse JSON with multiple fallback strategies
   */
  private safeJSONParse<T>(text: string, fallback: T): T {
    try {
      let cleaned = this.stripMarkdownCodeFences(text);
      cleaned = this.extractJSON(cleaned);
      cleaned = this.fixJSON(cleaned);
      return JSON.parse(cleaned);
    } catch (error: any) {
      console.error('JSON parse error:', error.message);
      console.error('Attempted to parse:', text.substring(0, 500));

      try {
        const extracted = this.extractJSON(text);
        const fixed = this.fixJSON(extracted);
        return JSON.parse(fixed);
      } catch (retryError: any) {
        console.error('JSON parse retry also failed:', retryError.message);
        return fallback;
      }
    }
  }

  /**
   * Filter search results to identify shoppable products
   */
  async filterShoppableProducts(searchResults: SearchResult[], isTravel: boolean = false): Promise<FilteredResult[]> {
    if (searchResults.length === 0) {
      return [];
    }

    const prompt = this.buildFilteringPrompt(searchResults, isTravel);

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '[]';

      console.log('Raw Anthropic filter response (first 500 chars):', text.substring(0, 500));

      const filtered = this.safeJSONParse<FilteredResult[]>(text, []);

      if (!Array.isArray(filtered)) {
        throw new Error('Expected array but got: ' + typeof filtered);
      }

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'filter',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return filtered;
    } catch (error: any) {
      console.error('AI filtering error:', error);
      throw new AppError(
        503,
        `AI service error: ${error.message}`,
        'AI_SERVICE_ERROR'
      );
    }
  }

  /**
   * Extract product data from HTML with enhanced offers/deals detection
   */
  async extractProductData(url: string, html: string): Promise<EnhancedProductData | null> {
    const truncatedHtml = html.substring(0, 15000); // Keep small for rate limits
    const prompt = this.buildEnhancedExtractionPrompt(url, truncatedHtml);

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : 'null';

      const data = this.safeJSONParse<EnhancedProductData | null>(text, null);

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'extract',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return data;
    } catch (error: any) {
      console.error('AI extraction error:', error);
      return null;
    }
  }

  /**
   * Extract travel listing data (flights, hotels, car rentals) from HTML
   */
  async extractTravelData(url: string, html: string): Promise<EnhancedProductData | null> {
    const truncatedHtml = html.substring(0, 15000);
    const prompt = `Extract travel listing information from this webpage. This could be a flight, hotel, car rental, or vacation package.

Return a JSON object:
{
  "name": "Descriptive listing name (e.g. 'Round-trip flight: NYC to Delhi' or 'Hilton Paris Opera - Deluxe Room')",
  "price": 599.99,
  "currency": "USD",
  "description": "Brief description of the travel option",
  "imageUrl": "https://...",
  "specifications": {
    "type": "flight|hotel|car_rental|package",
    "origin": "departure city if applicable",
    "destination": "arrival city / location",
    "departureDate": "date if shown",
    "returnDate": "date if shown",
    "airline": "airline name if flight",
    "hotelName": "hotel name if hotel",
    "starRating": "star rating if hotel",
    "duration": "trip duration or stay length",
    "stops": "nonstop / 1 stop / etc if flight",
    "roomType": "room type if hotel",
    "carType": "car type if rental"
  },
  "availability": "Available / Sold Out / Limited",
  "rating": 4.5,
  "reviewCount": 123,
  "brand": "Airline / Hotel chain / Rental company name",
  "category": "flight|hotel|car_rental|package",
  "offers": [
    {
      "originalPrice": 799.99,
      "salePrice": 599.99,
      "discountPercent": 25,
      "promoCode": null,
      "dealType": "sale",
      "expiresAt": null,
      "terms": null
    }
  ]
}

IMPORTANT:
- Extract price as a NUMBER (not a string with currency symbols)
- For flights: look for fare prices, base fare, total price
- For hotels: look for nightly rate or total stay cost
- If multiple options exist, extract the cheapest or first prominent one
- If the page lists multiple flights/hotels, extract the top result as a single listing
- If a field cannot be found, set it to null

URL: ${url}

HTML Content (truncated):
${truncatedHtml}

Return only the JSON object, no other text.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text'
        ? message.content[0].text
        : 'null';

      const data = this.safeJSONParse<EnhancedProductData | null>(text, null);

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'extract_travel',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return data;
    } catch (error: any) {
      console.error('AI travel extraction error:', error);
      return null;
    }
  }

  /**
   * Generate filters from product list
   */
  async generateFilters(products: Product[]): Promise<CreateProductFilterDTO[]> {
    if (products.length === 0) {
      return [];
    }

    const prompt = this.buildFilterGenerationPrompt(products);

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 2048,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '[]';

      const filters = this.safeJSONParse<CreateProductFilterDTO[]>(text, []);

      if (!Array.isArray(filters)) {
        console.warn('Expected array but got:', typeof filters);
        return [];
      }

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'generate_filters',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return filters;
    } catch (error: any) {
      console.error('AI filter generation error:', error);
      return [];
    }
  }

  /**
   * Search for nearby stores selling a product using AI knowledge
   */
  async findNearbyStores(
    productName: string,
    userLocation: { lat: number; lng: number; city?: string; country?: string }
  ): Promise<NearbyStore[]> {
    const locationStr = userLocation.city
      ? `${userLocation.city}, ${userLocation.country || ''}`
      : `coordinates ${userLocation.lat}, ${userLocation.lng}`;

    const prompt = `You are a shopping assistant with knowledge of retail stores. Find stores near ${locationStr} that sell "${productName}".

Return a JSON array of stores with this structure:
[
  {
    "name": "Store Name",
    "address": "Full address",
    "distance": "2.5 miles",
    "rating": 4.5,
    "isOpen": true,
    "phone": "+1-xxx-xxx-xxxx",
    "priceLevel": "$$"
  }
]

Include major retailers (Best Buy, Walmart, Target, Amazon Fresh, etc.) and local specialty stores if relevant.
Focus on stores that would realistically carry this product.
Return ONLY the JSON array, no other text.
If no stores are found, return an empty array [].
Limit to 10 stores maximum, sorted by relevance and distance.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '[]';

      const stores = this.safeJSONParse<NearbyStore[]>(text, []);

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'find_stores',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return stores;
    } catch (error: any) {
      console.error('Error finding nearby stores:', error);
      return [];
    }
  }

  /**
   * Find best deals and offers for a product
   */
  async findProductOffers(productName: string, currentPrice?: number): Promise<ProductOffer[]> {
    const priceContext = currentPrice ? `The current listed price is $${currentPrice}.` : '';

    const prompt = `You are a deal-finding assistant. Find current offers, deals, and discounts for "${productName}". ${priceContext}

Search your knowledge for:
1. Current sales and discounts
2. Known coupon codes
3. Bundle deals
4. Clearance pricing
5. Limited time offers
6. Price comparisons across retailers

Return a JSON array of offers:
[
  {
    "originalPrice": 299.99,
    "salePrice": 249.99,
    "discountPercent": 17,
    "promoCode": "SAVE50",
    "dealType": "sale",
    "expiresAt": "2025-12-31",
    "terms": "Valid for new customers only"
  }
]

Deal types: "sale", "clearance", "coupon", "bundle", "limited_time"

Return ONLY the JSON array.
If no current offers are known, return an empty array [].
Be accurate - only include offers you're confident exist.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '[]';

      const offers = this.safeJSONParse<ProductOffer[]>(text, []);

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'find_offers',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return offers;
    } catch (error: any) {
      console.error('Error finding product offers:', error);
      return [];
    }
  }

  /**
   * Enhanced product search with location and deals
   */
  async enhancedProductSearch(
    query: string,
    userLocation?: { lat: number; lng: number; city?: string; country?: string }
  ): Promise<{
    products: EnhancedProductData[];
    nearbyStores: NearbyStore[];
    offers: ProductOffer[];
  }> {
    const prompt = `You are an intelligent shopping assistant. Search for "${query}" and provide comprehensive results.

${userLocation ? `User location: ${userLocation.city || 'Unknown'}, ${userLocation.country || 'Unknown'} (${userLocation.lat}, ${userLocation.lng})` : ''}

Return a JSON object with:
{
  "products": [
    {
      "name": "Product Name",
      "price": 299.99,
      "currency": "USD",
      "description": "Product description",
      "imageUrl": "https://...",
      "brand": "Brand Name",
      "category": "Category",
      "availability": "In Stock",
      "rating": 4.5,
      "reviewCount": 1234,
      "offers": [
        {
          "originalPrice": 349.99,
          "salePrice": 299.99,
          "discountPercent": 14,
          "dealType": "sale"
        }
      ],
      "stores": ["Amazon", "Best Buy", "Walmart"]
    }
  ],
  "nearbyStores": [
    {
      "name": "Best Buy",
      "address": "123 Main St",
      "distance": "2.5 miles",
      "rating": 4.2,
      "isOpen": true
    }
  ],
  "bestDeals": [
    {
      "originalPrice": 349.99,
      "salePrice": 249.99,
      "discountPercent": 29,
      "promoCode": "HOLIDAY25",
      "dealType": "coupon",
      "terms": "Valid until Dec 31"
    }
  ]
}

Include:
1. Top 5-10 relevant products with current pricing
2. Nearby stores if location provided (top 5)
3. Best available deals and coupon codes

Return ONLY the JSON object.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '{}';

      const data = this.safeJSONParse<{
        products: EnhancedProductData[];
        nearbyStores: NearbyStore[];
        bestDeals: ProductOffer[];
      }>(text, { products: [], nearbyStores: [], bestDeals: [] });

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'enhanced_search',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return {
        products: data.products || [],
        nearbyStores: data.nearbyStores || [],
        offers: data.bestDeals || [],
      };
    } catch (error: any) {
      console.error('Enhanced search error:', error);
      return { products: [], nearbyStores: [], offers: [] };
    }
  }

  /**
   * Compare prices across multiple stores
   */
  async comparePrices(productName: string): Promise<{
    store: string;
    price: number;
    url?: string;
    inStock: boolean;
  }[]> {
    const prompt = `Compare prices for "${productName}" across major retailers.

Return a JSON array of price comparisons:
[
  {
    "store": "Amazon",
    "price": 299.99,
    "url": "https://amazon.com/...",
    "inStock": true
  },
  {
    "store": "Best Buy",
    "price": 319.99,
    "inStock": true
  },
  {
    "store": "Walmart",
    "price": 289.99,
    "inStock": false
  }
]

Include major retailers: Amazon, Best Buy, Walmart, Target, Costco, B&H Photo, Newegg, etc.
Sort by price (lowest first).
Return ONLY the JSON array.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '[]';

      const prices = this.safeJSONParse<{
        store: string;
        price: number;
        url?: string;
        inStock: boolean;
      }[]>(text, []);

      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'compare_prices',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          this.modelName
        );
      }

      return prices;
    } catch (error: any) {
      console.error('Price comparison error:', error);
      return [];
    }
  }

  private buildFilteringPrompt(searchResults: SearchResult[], isTravel: boolean = false): string {
    if (isTravel) {
      return `You are a travel search expert. Analyze the following search results and identify which are actual BOOKABLE travel listings (flights, hotels, car rentals, vacation packages) from booking websites versus informational pages, blogs, or non-booking content.

For each result, determine:
1. Is it a bookable/purchasable travel listing? (true/false) — Mark as true for booking sites like Google Flights, Kayak, Expedia, Booking.com, Hotels.com, Priceline, Skyscanner, Airbnb, VRBO, Travelocity, Hotwire, airline sites, hotel chain sites, car rental sites, and any page showing bookable travel with pricing.
2. Confidence level (0-100)
3. Brief reasoning

Search Results:
${JSON.stringify(searchResults, null, 2)}

Return a JSON array with this exact structure:
[
  {
    "title": "exact title from input",
    "url": "exact url from input",
    "snippet": "exact snippet from input",
    "displayUrl": "exact displayUrl from input",
    "isShoppable": true,
    "confidence": 85,
    "reasoning": "This is a Kayak flight search page with bookable flights and pricing"
  }
]

CRITICAL:
- Return ONLY valid JSON, no markdown, no code fences, no explanations
- Ensure all strings are properly escaped
- Include ALL results from the input array
- Travel aggregator pages, comparison pages, and booking pages should ALL be marked isShoppable: true
- Pages with flight/hotel prices in snippets are likely bookable`;
    }

    return `You are a product search expert. Analyze the following search results and identify which are actual product listings from e-commerce websites (shoppable products) versus informational pages, blogs, or non-shopping content.

For each result, determine:
1. Is it a shoppable product? (true/false)
2. Confidence level (0-100)
3. Brief reasoning

Search Results:
${JSON.stringify(searchResults, null, 2)}

Return a JSON array with this exact structure:
[
  {
    "title": "exact title from input",
    "url": "exact url from input",
    "snippet": "exact snippet from input",
    "displayUrl": "exact displayUrl from input",
    "isShoppable": true,
    "confidence": 85,
    "reasoning": "This is an Amazon product page with clear pricing and buy button"
  }
]

CRITICAL:
- Return ONLY valid JSON, no markdown, no code fences, no explanations
- Ensure all strings are properly escaped
- Include ALL results from the input array`;
  }

  private buildEnhancedExtractionPrompt(url: string, html: string): string {
    return `Extract product information from this webpage, including any deals or offers.

Return a JSON object:
{
  "name": "Product name",
  "price": 99.99,
  "currency": "USD",
  "description": "Product description",
  "imageUrl": "https://...",
  "specifications": { "key": "value" },
  "availability": "In Stock",
  "rating": 4.5,
  "reviewCount": 123,
  "brand": "Brand Name",
  "category": "Category",
  "offers": [
    {
      "originalPrice": 129.99,
      "salePrice": 99.99,
      "discountPercent": 23,
      "promoCode": null,
      "dealType": "sale",
      "expiresAt": null,
      "terms": null
    }
  ]
}

IMPORTANT PRICE EXTRACTION GUIDELINES:
- Extract price as a NUMBER (not a string with currency symbols)
- Look for prices in multiple formats: "$99.99", "99.99 USD", "€89.99", "£79.99", etc.
- Check structured data (JSON-LD, microdata, schema.org)
- Look for sale prices, discounted prices, or promotional prices
- If multiple prices exist, prefer the lowest/sale price
- Currency should be a 3-letter ISO code (USD, EUR, GBP, etc.)
- If price is a range (e.g., "$50-$100"), use the lower bound
- If price is missing but "From $X" exists, use that value
- Validate that prices are reasonable (not negative, not extremely high unless luxury item)

Look for:
- Sale prices, original prices, discount percentages
- Coupon codes, promo codes
- Limited time offers
- Bundle deals
- Clearance indicators
- Price in structured data (schema.org/Product, schema.org/Offer)
- Price in meta tags (og:price:amount, product:price:amount)

If a field cannot be found, set it to null.

URL: ${url}

HTML Content (truncated):
${html}

Return only the JSON object, no other text.`;
  }

  private buildFilterGenerationPrompt(products: Product[]): string {
    return `Analyze these products and generate useful filters for a shopping app.

Generate filters for:
1. Price ranges (create 3-4 meaningful ranges based on the actual prices)
2. Brands (if identifiable from product names)
3. Product categories
4. Deal types (on sale, clearance, etc.)
5. Availability
6. Other relevant attributes

Products:
${JSON.stringify(products.slice(0, 50).map(p => ({
  name: p.name,
  price: p.price,
  description: p.description,
})), null, 2)}

Return a JSON array:
[
  {
    "filterType": "price_range",
    "filterLabel": "$0 - $50",
    "filterValue": { "min": 0, "max": 50 }
  },
  {
    "filterType": "brand",
    "filterLabel": "Nike",
    "filterValue": "nike"
  },
  {
    "filterType": "deal",
    "filterLabel": "On Sale",
    "filterValue": "on_sale"
  }
]

Only return the JSON array, no other text. Generate 5-10 useful filters.`;
  }

  private async logUsage(
    operation: string,
    tokens: number,
    model: string
  ): Promise<void> {
    // Anthropic pricing: approximate cost calculation
    // Input: $3/million tokens, Output: $15/million tokens (for claude-sonnet-4)
    const inputTokens = tokens * 0.6; // Estimate 60% input
    const outputTokens = tokens * 0.4; // Estimate 40% output
    const cost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
    
    console.log(
      `AI Usage - Operation: ${operation}, Model: ${model}, Tokens: ${tokens}, Cost: $${cost.toFixed(6)} (Anthropic)`
    );
  }
}
