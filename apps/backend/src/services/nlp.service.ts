import Groq from 'groq-sdk';
import { config } from '../config/env';

/**
 * Parsed search query with extracted intent and constraints
 */
export interface ParsedSearchQuery {
  // Core search
  searchQuery: string; // Clean search query for Google
  productType: string; // Type of product (chair, flight, laptop, etc.)

  // Constraints
  maxPrice?: number;
  minPrice?: number;
  currency: string;
  specifications?: Record<string, any>; // e.g., { ergonomic: true, color: 'black' }

  // Intent
  shouldCreateIntent: boolean; // Should we auto-create an intent?
  intentType?: 'price_drop' | 'availability' | 'time_based' | 'general';
  intentReasoning?: string; // Why create this intent

  // Time-based (for flights, hotels, etc.)
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string

  // Location-based (for flights, hotels, local shopping)
  origin?: string;
  destination?: string;
  userCity?: string;
  userCountry?: string;
  searchRadius?: number; // in miles

  // User intent clarity
  confidence: number; // 0-100, how confident are we in the parsing
  clarificationNeeded?: string; // Ask user to clarify if low confidence

  // New: Local shopping preferences
  preferLocalStores?: boolean;
  preferOnline?: boolean;
  needsDelivery?: boolean;
  needsPickup?: boolean;
}

/**
 * NLP Service
 * Uses Groq AI to parse natural language search queries
 */
export class NLPService {
  private groq: Groq;
  private modelName: string;

  constructor() {
    if (!config.groq.apiKey) {
      console.warn('Groq API key not configured for NLP');
    }

    this.groq = new Groq({ apiKey: config.groq.apiKey });
    this.modelName = config.groq.defaultModel;

    console.log(`NLP Service initialized with Groq model: ${this.modelName}`);
  }

  /**
   * Parse natural language query into structured search parameters
   */
  async parseSearchQuery(
    naturalLanguageQuery: string,
    userLocation?: { city?: string; country?: string; lat?: number; lng?: number }
  ): Promise<ParsedSearchQuery> {
    const prompt = this.buildNLPPrompt(naturalLanguageQuery, userLocation);

    try {
      console.log(`Parsing natural language query: "${naturalLanguageQuery}"`);

      const completion = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
      });

      const text = completion.choices[0]?.message?.content || '{}';

      // Strip markdown code fences if present
      const cleanedText = this.stripMarkdownCodeFences(text);
      const parsed = JSON.parse(cleanedText) as ParsedSearchQuery;

      console.log('NLP parsing successful:', {
        searchQuery: parsed.searchQuery,
        productType: parsed.productType,
        maxPrice: parsed.maxPrice,
        shouldCreateIntent: parsed.shouldCreateIntent,
        preferLocalStores: parsed.preferLocalStores,
        confidence: parsed.confidence,
      });

      // Log token usage
      const usage = completion.usage;
      if (usage) {
        await this.logUsage(
          'nlp_parse',
          (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
          this.modelName
        );
      }

      return parsed;
    } catch (error: any) {
      console.error('NLP parsing error:', error);
      return this.fallbackParsing(naturalLanguageQuery);
    }
  }

  /**
   * Build prompt for Groq to parse natural language
   */
  private buildNLPPrompt(
    query: string,
    userLocation?: { city?: string; country?: string; lat?: number; lng?: number }
  ): string {
    const locationContext = userLocation
      ? `User's current location: ${userLocation.city || 'Unknown city'}, ${userLocation.country || 'Unknown country'}`
      : 'User location not provided';

    return `You are an intelligent shopping assistant. Parse this natural language shopping query into structured data.

Natural Language Query:
"${query}"

${locationContext}

Extract the following information:

1. **searchQuery**: Clean search terms optimized for product search (e.g., "ergonomic office chair" or "iPhone 15 Pro Max")
2. **productType**: Type of product (e.g., "chair", "flight", "laptop", "phone", "headphones")
3. **maxPrice**: Maximum price user is willing to pay (number only, null if not specified)
4. **minPrice**: Minimum price if specified (number only, null if not specified)
5. **currency**: Currency code (USD, EUR, INR, etc.) - default to USD
6. **specifications**: Object with specific requirements (e.g., {"ergonomic": true, "color": "black", "storage": "256GB"})
7. **shouldCreateIntent**: true if user wants automatic purchase/notification, false if just browsing
8. **intentType**: If shouldCreateIntent is true:
   - "price_drop" - user wants to buy if price drops below threshold
   - "availability" - user wants notification when available
   - "time_based" - user wants to buy on specific date
   - "general" - general interest in purchasing
9. **intentReasoning**: Brief explanation of why we should create an intent
10. **startDate**: ISO date string if user mentioned a start date (YYYY-MM-DD)
11. **endDate**: ISO date string if user mentioned an end date (YYYY-MM-DD)
12. **origin**: Starting location (for flights, travel)
13. **destination**: Ending location (for flights, travel)
14. **userCity**: User's city from context or query
15. **userCountry**: User's country from context or query
16. **searchRadius**: Search radius in miles if user wants local results (default 25 if local search)
17. **confidence**: 0-100, your confidence in this parsing
18. **clarificationNeeded**: If confidence < 70, what should we ask the user?
19. **preferLocalStores**: true if user wants to find nearby physical stores
20. **preferOnline**: true if user prefers online shopping
21. **needsDelivery**: true if user needs delivery
22. **needsPickup**: true if user wants in-store pickup

IMPORTANT: Detect local shopping intent from phrases like:
- "near me", "nearby", "close to me", "in my area"
- "local stores", "stores around me", "where can I buy"
- "in [city name]", "in [location]"
- "pick up today", "available locally"

Examples:

Query: "I want to buy an ergonomic chair which is below 200 usd"
Response:
{
  "searchQuery": "ergonomic office chair",
  "productType": "chair",
  "maxPrice": 200,
  "minPrice": null,
  "currency": "USD",
  "specifications": {"ergonomic": true},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": null,
  "destination": null,
  "userCity": null,
  "userCountry": null,
  "searchRadius": null,
  "confidence": 95,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false
}

Query: "Where can I buy AirPods Pro near me in Atlanta?"
Response:
{
  "searchQuery": "Apple AirPods Pro",
  "productType": "headphones",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": {"brand": "Apple", "model": "AirPods Pro"},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": null,
  "destination": null,
  "userCity": "Atlanta",
  "userCountry": "USA",
  "searchRadius": 25,
  "confidence": 95,
  "clarificationNeeded": null,
  "preferLocalStores": true,
  "preferOnline": false,
  "needsDelivery": false,
  "needsPickup": true
}

Query: "Find me the best deals on MacBook Pro"
Response:
{
  "searchQuery": "MacBook Pro best deals discount",
  "productType": "laptop",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": {"brand": "Apple", "model": "MacBook Pro"},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": null,
  "destination": null,
  "userCity": null,
  "userCountry": null,
  "searchRadius": null,
  "confidence": 90,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false
}

Query: "Book a flight from Atlanta to Pune on 1/28/2026, back on 2/2/2026 if under $1000"
Response:
{
  "searchQuery": "round trip flights Atlanta to Pune",
  "productType": "flight",
  "maxPrice": 1000,
  "minPrice": null,
  "currency": "USD",
  "specifications": {"roundTrip": true, "class": "economy"},
  "shouldCreateIntent": true,
  "intentType": "price_drop",
  "intentReasoning": "User wants automatic booking if round-trip price is below $1000",
  "startDate": "2026-01-28",
  "endDate": "2026-02-02",
  "origin": "Atlanta",
  "destination": "Pune",
  "userCity": "Atlanta",
  "userCountry": "USA",
  "searchRadius": null,
  "confidence": 98,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false
}

Query: "Show me stores selling Sony headphones with good discounts"
Response:
{
  "searchQuery": "Sony headphones on sale discount",
  "productType": "headphones",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": {"brand": "Sony"},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": null,
  "destination": null,
  "userCity": null,
  "userCountry": null,
  "searchRadius": 25,
  "confidence": 85,
  "clarificationNeeded": null,
  "preferLocalStores": true,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false
}

Now parse the user's query and return ONLY the JSON object, no other text.`;
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
   * Fallback parsing when AI fails
   */
  private fallbackParsing(query: string): ParsedSearchQuery {
    console.log('Using fallback NLP parsing');

    const lowerQuery = query.toLowerCase();

    // Extract price if mentioned
    const priceMatch = lowerQuery.match(/(?:below|under|less than|<)\s*\$?(\d+)/);
    const maxPrice = priceMatch ? parseInt(priceMatch[1], 10) : undefined;

    // Detect if user wants intent
    const intentKeywords = ['book', 'buy if', 'notify', 'alert', 'when available'];
    const shouldCreateIntent = intentKeywords.some(keyword => lowerQuery.includes(keyword));

    // Detect local shopping intent
    const localKeywords = ['near me', 'nearby', 'local', 'stores', 'where can i buy', 'in store'];
    const preferLocalStores = localKeywords.some(keyword => lowerQuery.includes(keyword));

    // Detect deals/offers intent
    const dealKeywords = ['deal', 'discount', 'sale', 'offer', 'coupon', 'promo'];
    const wantDeals = dealKeywords.some(keyword => lowerQuery.includes(keyword));

    return {
      searchQuery: wantDeals ? `${query} deals discounts` : query,
      productType: 'product',
      maxPrice,
      currency: 'USD',
      shouldCreateIntent,
      confidence: 50,
      clarificationNeeded: 'Could not fully parse your query. Please try being more specific.',
      preferLocalStores,
      preferOnline: !preferLocalStores,
      searchRadius: preferLocalStores ? 25 : undefined,
    };
  }

  /**
   * Log token usage for cost tracking
   */
  private async logUsage(
    operation: string,
    tokens: number,
    model: string
  ): Promise<void> {
    // Groq pricing is free tier, but log for tracking
    console.log(
      `AI Usage - Operation: ${operation}, Model: ${model}, Tokens: ${tokens}, Cost: FREE (Groq)`
    );
  }
}
