import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;

  constructor() {
    if (!config.gemini.apiKey) {
      console.warn('Gemini API key not configured');
    }

    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.defaultModel;
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });

    console.log(`AI Service initialized with Gemini model: ${this.modelName}`);
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
  async filterShoppableProducts(searchResults: SearchResult[]): Promise<FilteredResult[]> {
    if (searchResults.length === 0) {
      return [];
    }

    const prompt = this.buildFilteringPrompt(searchResults);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log('Raw Gemini filter response (first 500 chars):', text.substring(0, 500));

      const filtered = this.safeJSONParse<FilteredResult[]>(text, []);

      if (!Array.isArray(filtered)) {
        throw new Error('Expected array but got: ' + typeof filtered);
      }

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'filter',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
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
    const truncatedHtml = html.substring(0, 50000);
    const prompt = this.buildEnhancedExtractionPrompt(url, truncatedHtml);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const data = this.safeJSONParse<EnhancedProductData | null>(text, null);

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'extract',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
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
   * Generate filters from product list
   */
  async generateFilters(products: Product[]): Promise<CreateProductFilterDTO[]> {
    if (products.length === 0) {
      return [];
    }

    const prompt = this.buildFilterGenerationPrompt(products);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const filters = this.safeJSONParse<CreateProductFilterDTO[]>(text, []);

      if (!Array.isArray(filters)) {
        console.warn('Expected array but got:', typeof filters);
        return [];
      }

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'generate_filters',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
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
   * Search for nearby stores selling a product using Gemini's knowledge
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const stores = this.safeJSONParse<NearbyStore[]>(text, []);

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'find_stores',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const offers = this.safeJSONParse<ProductOffer[]>(text, []);

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'find_offers',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const data = this.safeJSONParse<{
        products: EnhancedProductData[];
        nearbyStores: NearbyStore[];
        bestDeals: ProductOffer[];
      }>(text, { products: [], nearbyStores: [], bestDeals: [] });

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'enhanced_search',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const prices = this.safeJSONParse<{
        store: string;
        price: number;
        url?: string;
        inStock: boolean;
      }[]>(text, []);

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          'compare_prices',
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
          this.modelName
        );
      }

      return prices;
    } catch (error: any) {
      console.error('Price comparison error:', error);
      return [];
    }
  }

  private buildFilteringPrompt(searchResults: SearchResult[]): string {
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

Look for:
- Sale prices, original prices, discount percentages
- Coupon codes, promo codes
- Limited time offers
- Bundle deals
- Clearance indicators

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
    // Gemini pricing (approximate)
    const costPer1MTokens = model.includes('pro') ? 1.25 : 0.075; // Pro vs Flash
    const costEstimate = (tokens / 1_000_000) * costPer1MTokens;

    console.log(
      `AI Usage - Operation: ${operation}, Model: ${model}, Tokens: ${tokens}, Cost: $${costEstimate.toFixed(6)}`
    );
  }
}
