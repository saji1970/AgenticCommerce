import Anthropic from '@anthropic-ai/sdk';
import {
  SearchResult,
  FilteredResult,
  ExtractedProductData,
  Product,
  ProductFilter,
  CreateProductFilterDTO,
} from '@agentic-commerce/shared-types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export class AIService {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!config.anthropic.apiKey) {
      console.warn('⚠️  Anthropic API key not configured');
    }

    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey || 'dummy-key',
    });
    this.model = config.anthropic.defaultModel;
  }

  async filterShoppableProducts(searchResults: SearchResult[]): Promise<FilteredResult[]> {
    if (searchResults.length === 0) {
      return [];
    }

    const prompt = this.buildFilteringPrompt(searchResults);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const filtered = JSON.parse(response.text);

      await this.logUsage(
        'filter',
        message.usage.input_tokens + message.usage.output_tokens,
        this.model
      );

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

  async extractProductData(url: string, html: string): Promise<ExtractedProductData | null> {
    const truncatedHtml = html.substring(0, 50000);
    const prompt = this.buildExtractionPrompt(url, truncatedHtml);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const data = JSON.parse(response.text);

      await this.logUsage(
        'extract',
        message.usage.input_tokens + message.usage.output_tokens,
        this.model
      );

      return data;
    } catch (error: any) {
      console.error('AI extraction error:', error);
      return null; // Return null on extraction failure, don't block the whole search
    }
  }

  async generateFilters(products: Product[]): Promise<CreateProductFilterDTO[]> {
    if (products.length === 0) {
      return [];
    }

    const prompt = this.buildFilterGenerationPrompt(products);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const filters = JSON.parse(response.text);

      await this.logUsage(
        'generate_filters',
        message.usage.input_tokens + message.usage.output_tokens,
        this.model
      );

      return filters;
    } catch (error: any) {
      console.error('AI filter generation error:', error);
      return []; // Return empty array on failure, don't block the search
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

Only return the JSON array, no other text. Include ALL results from the input, marking each as shoppable or not.`;
  }

  private buildExtractionPrompt(url: string, html: string): string {
    return `Extract product information from this webpage. Return a JSON object with the following structure:

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
  "category": "Category"
}

If a field cannot be found, set it to null. Be conservative - only extract data you're confident about.

URL: ${url}

HTML Content (truncated):
${html}

Return only the JSON object, no other text.`;
  }

  private buildFilterGenerationPrompt(products: Product[]): string {
    return `Analyze these products and generate useful filters for a shopping app.

Generate filters for:
1. Price ranges (create 3-4 meaningful ranges based on the actual prices in the data)
2. Brands (if identifiable from product names)
3. Product categories (if identifiable)
4. Other relevant attributes you notice

Products:
${JSON.stringify(products.slice(0, 50).map(p => ({
  name: p.name,
  price: p.price,
  description: p.description,
})), null, 2)}

Return a JSON array with this structure:
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
    "filterType": "category",
    "filterLabel": "Electronics",
    "filterValue": "electronics"
  }
]

Only return the JSON array, no other text. Generate 5-10 useful filters.`;
  }

  private async logUsage(
    operation: string,
    tokens: number,
    model: string
  ): Promise<void> {
    // Calculate cost estimate
    const costPer1MTokens = model.includes('opus') ? 15.0 : 3.0;
    const costEstimate = (tokens / 1_000_000) * costPer1MTokens;

    console.log(
      `AI Usage - Operation: ${operation}, Model: ${model}, Tokens: ${tokens}, Cost: $${costEstimate.toFixed(6)}`
    );

    // TODO: Save to ai_processing_logs table via repository
    // This can be implemented later for cost tracking
  }
}
