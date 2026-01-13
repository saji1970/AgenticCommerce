import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

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

  // Location-based (for flights, hotels)
  origin?: string;
  destination?: string;

  // User intent clarity
  confidence: number; // 0-100, how confident are we in the parsing
  clarificationNeeded?: string; // Ask user to clarify if low confidence
}

/**
 * NLP Service
 * Uses Claude AI to parse natural language search queries
 */
export class NLPService {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!config.anthropic.apiKey) {
      console.warn('⚠️  Anthropic API key not configured for NLP');
    }

    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey || 'dummy-key',
    });
    this.model = config.anthropic.defaultModel;
  }

  /**
   * Parse natural language query into structured search parameters
   */
  async parseSearchQuery(naturalLanguageQuery: string): Promise<ParsedSearchQuery> {
    const prompt = this.buildNLPPrompt(naturalLanguageQuery);

    try {
      console.log(`🧠 Parsing natural language query: "${naturalLanguageQuery}"`);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Strip markdown code fences if present
      const cleanedText = this.stripMarkdownCodeFences(response.text);
      const parsed = JSON.parse(cleanedText) as ParsedSearchQuery;

      console.log('✅ NLP parsing successful:', {
        searchQuery: parsed.searchQuery,
        productType: parsed.productType,
        maxPrice: parsed.maxPrice,
        shouldCreateIntent: parsed.shouldCreateIntent,
        confidence: parsed.confidence,
      });

      // Log token usage
      await this.logUsage(
        'nlp_parse',
        message.usage.input_tokens + message.usage.output_tokens,
        this.model
      );

      return parsed;
    } catch (error: any) {
      console.error('NLP parsing error:', error);

      // Fallback: return basic parsing
      return this.fallbackParsing(naturalLanguageQuery);
    }
  }

  /**
   * Build prompt for Claude to parse natural language
   */
  private buildNLPPrompt(query: string): string {
    return `You are an intelligent shopping assistant. Parse this natural language shopping query into structured data.

Natural Language Query:
"${query}"

Extract the following information:

1. **searchQuery**: Clean search terms for Google (e.g., "ergonomic chair" or "flight Atlanta to Pune")
2. **productType**: Type of product (e.g., "chair", "flight", "laptop", "phone")
3. **maxPrice**: Maximum price user is willing to pay (number only, null if not specified)
4. **minPrice**: Minimum price if specified (number only, null if not specified)
5. **currency**: Currency code (USD, EUR, INR, etc.) - default to USD
6. **specifications**: Object with specific requirements (e.g., {"ergonomic": true, "color": "black", "size": "large"})
7. **shouldCreateIntent**: true if user wants automatic purchase/notification, false if just browsing
8. **intentType**: If shouldCreateIntent is true, determine type:
   - "price_drop" - user wants to buy if price drops below threshold
   - "availability" - user wants notification when available
   - "time_based" - user wants to buy on specific date
   - "general" - general interest in purchasing
9. **intentReasoning**: Brief explanation of why we should create an intent (if shouldCreateIntent is true)
10. **startDate**: ISO date string if user mentioned a start date (YYYY-MM-DD)
11. **endDate**: ISO date string if user mentioned an end date (YYYY-MM-DD)
12. **origin**: Starting location (for flights, travel)
13. **destination**: Ending location (for flights, travel)
14. **confidence**: 0-100, your confidence in this parsing
15. **clarificationNeeded**: If confidence < 70, what should we ask the user to clarify?

Examples:

Query: "I want to buy an ergonomic chair which is below 200 usd"
Response:
{
  "searchQuery": "ergonomic chair",
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
  "confidence": 95,
  "clarificationNeeded": null
}

Query: "I would like to book a flight ticket from atlanta to pune on 1/28/2026 and back on 2/2/2026 if the price of the to and fro is below 1000 usd book it"
Response:
{
  "searchQuery": "flight tickets Atlanta to Pune round trip",
  "productType": "flight",
  "maxPrice": 1000,
  "minPrice": null,
  "currency": "USD",
  "specifications": {"roundTrip": true},
  "shouldCreateIntent": true,
  "intentType": "price_drop",
  "intentReasoning": "User wants automatic booking if round-trip price is below $1000",
  "startDate": "2026-01-28",
  "endDate": "2026-02-02",
  "origin": "Atlanta",
  "destination": "Pune",
  "confidence": 98,
  "clarificationNeeded": null
}

Query: "looking for laptops"
Response:
{
  "searchQuery": "laptops",
  "productType": "laptop",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": null,
  "shouldCreateIntent": false,
  "intentType": null,
  "intentReasoning": null,
  "startDate": null,
  "endDate": null,
  "origin": null,
  "destination": null,
  "confidence": 90,
  "clarificationNeeded": null
}

Query: "notify me when PS5 is back in stock"
Response:
{
  "searchQuery": "PlayStation 5 PS5",
  "productType": "gaming console",
  "maxPrice": null,
  "minPrice": null,
  "currency": "USD",
  "specifications": null,
  "shouldCreateIntent": true,
  "intentType": "availability",
  "intentReasoning": "User wants notification when PS5 becomes available",
  "startDate": null,
  "endDate": null,
  "origin": null,
  "destination": null,
  "confidence": 95,
  "clarificationNeeded": null
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
   * Uses simple heuristics to extract basic info
   */
  private fallbackParsing(query: string): ParsedSearchQuery {
    console.log('⚠️  Using fallback NLP parsing');

    const lowerQuery = query.toLowerCase();

    // Extract price if mentioned
    const priceMatch = lowerQuery.match(/(?:below|under|less than|<)\s*\$?(\d+)/);
    const maxPrice = priceMatch ? parseInt(priceMatch[1], 10) : undefined;

    // Detect if user wants intent
    const intentKeywords = ['book', 'buy if', 'notify', 'alert', 'when available'];
    const shouldCreateIntent = intentKeywords.some(keyword => lowerQuery.includes(keyword));

    return {
      searchQuery: query,
      productType: 'product',
      maxPrice,
      currency: 'USD',
      shouldCreateIntent,
      confidence: 50,
      clarificationNeeded: 'Could not fully parse your query. Please try being more specific.',
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
    const costPer1MTokens = model.includes('opus') ? 15.0 : 3.0;
    const costEstimate = (tokens / 1_000_000) * costPer1MTokens;

    console.log(
      `AI Usage - Operation: ${operation}, Model: ${model}, Tokens: ${tokens}, Cost: $${costEstimate.toFixed(6)}`
    );
  }
}
