import Anthropic from '@anthropic-ai/sdk';
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

  // Search type detection
  isTravel?: boolean; // true for flights, hotels, travel services
  isProduct?: boolean; // true for physical products

  // Flight-specific (SerpAPI Google Flights)
  travelClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  adults?: number;
  children?: number;
  infantsInSeat?: number;
  infantsOnLap?: number;
  stops?: 0 | 1 | 2 | 3; // 0=any, 1=nonstop, 2=1 or fewer, 3=2 or fewer
  sortBy?: 1 | 2 | 3 | 4 | 5 | 6; // 1=top, 2=price, 3=departure, 4=arrival, 5=duration, 6=emissions
  deepSearch?: boolean;
  excludeAirlines?: string; // comma-separated IATA codes
  includeAirlines?: string;
  excludeBasic?: boolean; // exclude basic economy (US domestic only)
  emissions?: boolean; // less emissions only
  outboundTimes?: string; // e.g. "4,18" for 4am-7pm departure
  returnTimes?: string;
  bags?: number; // carry-on bags
  excludeConns?: string; // comma-separated airport codes to exclude
  maxDuration?: number; // max flight duration in minutes
}

/**
 * NLP Service
 * Uses Anthropic Claude to parse natural language search queries
 */
export class NLPService {
  private anthropic: Anthropic;
  private modelName: string;

  constructor() {
    if (!config.anthropic.apiKey) {
      console.warn('Anthropic API key not configured for NLP');
    }

    this.anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
    this.modelName = config.anthropic.model;

    console.log(`NLP Service initialized with Anthropic Claude model: ${this.modelName}`);
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

      const message = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 2048,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '{}';

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
      const usage = message.usage;
      if (usage) {
        await this.logUsage(
          'nlp_parse',
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
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
   * Build prompt for Anthropic Claude to parse natural language
   */
  private buildNLPPrompt(
    query: string,
    userLocation?: { city?: string; country?: string; lat?: number; lng?: number }
  ): string {
    const locationContext = userLocation
      ? `User's current location: ${userLocation.city || 'Unknown city'}, ${userLocation.country || 'Unknown country'}`
      : 'User location not provided';

    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    return `You are an intelligent shopping assistant. Parse this natural language shopping query into structured data.

Natural Language Query:
"${query}"

${locationContext}
Today's date: ${currentDate}

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
10. **startDate**: ISO date string if user mentioned a start date (YYYY-MM-DD). Return null if the user did NOT mention any date. When user says only a month (e.g. "March"), use the current year ${currentYear} and the first of that month. Never use past dates — always use ${currentYear} or later.
11. **endDate**: ISO date string if user mentioned an end date (YYYY-MM-DD). Return null if the user did NOT mention any date. Same rule: use ${currentYear} or later for all dates.
12. **origin**: Starting location (for flights, travel). For flight queries, use the 3-letter IATA airport code if you know it (e.g., "ATL" not "Atlanta", "JFK" not "New York"). If unsure, return the city name. IMPORTANT: "New York" = JFK/NYC area; "Newark" = EWR (different city in NJ). Do not confuse them.
13. **destination**: Ending location (for flights, travel). Same rule: use IATA airport codes for flights (e.g., "LAS" not "Las Vegas", "MAA" not "Chennai", "LHR" not "London"). If unsure, return the city name.
14. **userCity**: User's city from context or query
15. **userCountry**: User's country from context or query
16. **searchRadius**: Search radius in miles if user wants local results (default 25 if local search)
17. **confidence**: 0-100, your confidence in this parsing
18. **clarificationNeeded**: If confidence < 70, what should we ask the user?
19. **preferLocalStores**: true if user wants to find nearby physical stores
20. **preferOnline**: true if user prefers online shopping
21. **needsDelivery**: true if user needs delivery
22. **needsPickup**: true if user wants in-store pickup
23. **isTravel**: true if query is for flights, hotels, travel services (not physical products)
24. **isProduct**: true if query is for physical products (not travel)

For FLIGHT queries, also extract (all optional, null if not mentioned):
25. **travelClass**: "economy" | "premium_economy" | "business" | "first"
26. **adults**: number of adults (default 1)
27. **children**: number of children
28. **stops**: 0=any, 1=nonstop only, 2=1 stop or fewer, 3=2 stops or fewer
29. **sortBy**: 1=top flights, 2=price, 3=departure time, 4=arrival time, 5=duration, 6=emissions
30. **deepSearch**: true if user wants precise/browser-identical results (slower)
31. **excludeAirlines**: comma-separated IATA codes (e.g. "UA,AA")
32. **includeAirlines**: comma-separated IATA codes
33. **excludeBasic**: true to exclude basic economy (US domestic)
34. **emissions**: true for less emissions only
35. **bags**: number of carry-on bags
36. **maxDuration**: max flight duration in minutes

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
  "needsPickup": false,
  "isTravel": false,
  "isProduct": true,
  "travelClass": null,
  "adults": null,
  "children": null,
  "stops": null,
  "sortBy": null,
  "deepSearch": null,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
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
  "needsPickup": true,
  "isTravel": false,
  "isProduct": true,
  "travelClass": null,
  "adults": null,
  "children": null,
  "stops": null,
  "sortBy": null,
  "deepSearch": null,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
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
  "needsPickup": false,
  "isTravel": false,
  "isProduct": true
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
  "origin": "ATL",
  "destination": "PNQ",
  "userCity": "Atlanta",
  "userCountry": "USA",
  "searchRadius": null,
  "confidence": 98,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false,
  "isTravel": true,
  "isProduct": false,
  "travelClass": "economy",
  "adults": 1,
  "children": null,
  "stops": null,
  "sortBy": null,
  "deepSearch": false,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
}

Query: "Nonstop flights from JFK to London under $500, sort by price"
Response:
{
  "searchQuery": "flights JFK to London",
  "productType": "flight",
  "maxPrice": 500,
  "minPrice": null,
  "currency": "USD",
  "specifications": {},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": "JFK",
  "destination": "LHR",
  "userCity": null,
  "userCountry": null,
  "searchRadius": null,
  "confidence": 92,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false,
  "isTravel": true,
  "isProduct": false,
  "travelClass": null,
  "adults": 1,
  "children": null,
  "stops": 1,
  "sortBy": 2,
  "deepSearch": false,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
}

Query: "Search flights from New York to Las Vegas"
Response:
{
  "searchQuery": "flights New York to Las Vegas",
  "productType": "flight",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": {},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": "New York",
  "destination": "Las Vegas",
  "userCity": null,
  "userCountry": null,
  "searchRadius": null,
  "confidence": 95,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false,
  "isTravel": true,
  "isProduct": false,
  "travelClass": null,
  "adults": 1,
  "children": null,
  "stops": null,
  "sortBy": null,
  "deepSearch": null,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
}

Query: "flights from New York to Chennai"
Response:
{
  "searchQuery": "flights New York to Chennai",
  "productType": "flight",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": {},
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": "New York",
  "destination": "Chennai",
  "userCity": null,
  "userCountry": null,
  "searchRadius": null,
  "confidence": 95,
  "clarificationNeeded": null,
  "preferLocalStores": false,
  "preferOnline": true,
  "needsDelivery": false,
  "needsPickup": false,
  "isTravel": true,
  "isProduct": false,
  "travelClass": null,
  "adults": 1,
  "children": null,
  "stops": null,
  "sortBy": null,
  "deepSearch": null,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
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
  "needsPickup": false,
  "isTravel": false,
  "isProduct": true,
  "travelClass": null,
  "adults": null,
  "children": null,
  "stops": null,
  "sortBy": null,
  "deepSearch": null,
  "excludeAirlines": null,
  "includeAirlines": null,
  "excludeBasic": null,
  "emissions": null,
  "bags": null,
  "maxDuration": null
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

    // Detect travel vs product
    const travelKeywords = ['flight', 'hotel', 'travel', 'trip', 'booking', 'airline'];
    const isTravel = travelKeywords.some(keyword => lowerQuery.includes(keyword));
    const isProduct = !isTravel; // Default to product if not travel

    return {
      searchQuery: wantDeals ? `${query} deals discounts` : query,
      productType: isTravel ? 'travel' : 'product',
      maxPrice,
      currency: 'USD',
      shouldCreateIntent,
      confidence: 50,
      clarificationNeeded: 'Could not fully parse your query. Please try being more specific.',
      preferLocalStores,
      preferOnline: !preferLocalStores,
      searchRadius: preferLocalStores ? 25 : undefined,
      isTravel,
      isProduct,
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
