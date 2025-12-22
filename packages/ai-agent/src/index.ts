import Anthropic from '@anthropic-ai/sdk';
import {
  AgentMessage,
  AgentContext,
  Product,
  SignedMandate,
  IntentMandate,
  CartMandate,
} from '@agentic-commerce/shared';
import { MCPClient } from '@agentic-commerce/mcp-client';
import { MandateManager } from '@agentic-commerce/ap2-mandate';

export interface AgentConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface ChatResponse {
  message: string;
  products?: Product[];
  suggestions?: string[];
  action?: string;
  intentMandate?: SignedMandate<IntentMandate>;
  cartMandate?: SignedMandate<CartMandate>;
}

export class ShoppingAgent {
  private client: Anthropic;
  private mcpClient: MCPClient;
  private mandateManager: MandateManager;
  private model: string;
  private maxTokens: number;
  private currentIntentMandate?: SignedMandate<IntentMandate>;

  constructor(
    config: AgentConfig,
    mcpClient: MCPClient,
    mandateManager?: MandateManager
  ) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.mcpClient = mcpClient;
    this.mandateManager = mandateManager || new MandateManager();
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
  }

  async chat(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: anthropicMessages as any,
      });

      const content = response.content[0];
      const messageText = content.type === 'text' ? content.text : '';

      // Parse agent response for actions
      const actionMatch = messageText.match(/\[ACTION:(\w+)\]/);
      const action = actionMatch ? actionMatch[1] : undefined;

      // Extract products if mentioned
      let products: Product[] | undefined;
      if (action === 'SEARCH') {
        const query = this.extractSearchQuery(messageText);
        if (query) {
          products = await this.mcpClient.searchProducts({ query });
        }
      }

      // Generate suggestions
      const suggestions = this.generateSuggestions(messageText, context);

      return {
        message: messageText.replace(/\[ACTION:\w+\]/g, '').trim(),
        products,
        suggestions,
        action,
      };
    } catch (error) {
      console.error('Agent chat error:', error);
      throw error;
    }
  }

  async searchProducts(query: string, context?: AgentContext): Promise<Product[]> {
    const filters: any = { query };

    if (context?.category) {
      filters.category = context.category;
    }

    if (context?.budget) {
      filters.maxPrice = context.budget;
    }

    if (context?.preferredRetailers && context.preferredRetailers.length > 0) {
      filters.retailer = context.preferredRetailers[0];
    }

    return await this.mcpClient.searchProducts(filters);
  }

  async compareProducts(productIds: string[]): Promise<any> {
    // TODO: Implement product comparison logic
    // This would fetch details for multiple products and generate a comparison
    return {
      message: 'Product comparison feature coming soon',
      products: [],
    };
  }

  private buildSystemPrompt(context?: AgentContext): string {
    let prompt = `You are an AI shopping assistant for an e-commerce platform. Your role is to help users find, compare, and purchase products based on their needs and preferences.

Your capabilities:
- Search for products across multiple retailers
- Compare products based on price, features, reviews, and availability
- Provide personalized recommendations
- Answer questions about products, shipping, and returns
- Help users make informed purchasing decisions

Guidelines:
- Be helpful, friendly, and professional
- Ask clarifying questions when needed
- Prioritize user preferences and budget constraints
- Explain your reasoning for recommendations
- Be transparent about product availability and pricing
- Use [ACTION:SEARCH] tag when you need to search for products
- Use [ACTION:COMPARE] tag when comparing multiple products`;

    if (context) {
      prompt += '\n\nCurrent Context:';
      if (context.budget) prompt += `\n- Budget: $${context.budget}`;
      if (context.category) prompt += `\n- Category: ${context.category}`;
      if (context.preferredRetailers)
        prompt += `\n- Preferred Retailers: ${context.preferredRetailers.join(', ')}`;
      if (context.urgency) prompt += `\n- Urgency: ${context.urgency}`;
    }

    return prompt;
  }

  private extractSearchQuery(message: string): string | null {
    // Simple extraction - in production, use better NLP
    const searchPattern = /(?:find|search|look for|show me)\s+(.+?)(?:\.|$)/i;
    const match = message.match(searchPattern);
    return match ? match[1].trim() : null;
  }

  private generateSuggestions(message: string, context?: AgentContext): string[] {
    // Generate follow-up suggestions based on the conversation
    const suggestions: string[] = [];

    if (message.includes('product') || message.includes('item')) {
      suggestions.push('Show me more details');
      suggestions.push('Compare with similar products');
      suggestions.push('Check price history');
    }

    if (context?.budget) {
      suggestions.push('Find cheaper alternatives');
    }

    suggestions.push('What are the reviews like?');
    suggestions.push('When can it be delivered?');

    return suggestions.slice(0, 3);
  }

  /**
   * AP2: Create Intent Mandate for a shopping request
   */
  async createIntentMandate(
    userId: string,
    request: string,
    context?: AgentContext
  ): Promise<SignedMandate<IntentMandate>> {
    const maxPrice = context?.budget || 1000; // Default max price
    const minPrice = context?.minBudget;
    const timeLimitHours = 24; // Intent mandate valid for 24 hours

    const intentMandate = this.mandateManager.createIntentMandate({
      user_id: userId,
      request,
      max_price: maxPrice,
      min_price: minPrice,
      time_limit_hours: timeLimitHours,
      approved_merchants: context?.preferredRetailers,
      categories: context?.category ? [context.category] : undefined,
    });

    this.currentIntentMandate = intentMandate;
    return intentMandate;
  }

  /**
   * AP2: Create Cart Mandate for purchase
   */
  async createCartMandate(
    userId: string,
    selectedProducts: Product[],
    merchant: { id: string; name: string },
    paymentMethodId?: string,
    shippingAddress?: any
  ): Promise<SignedMandate<CartMandate>> {
    if (!this.currentIntentMandate) {
      throw new Error('No active Intent Mandate found. Create an Intent Mandate first.');
    }

    const items = selectedProducts.map((product) => ({
      product_id: product.id,
      name: product.name,
      description: product.description,
      quantity: 1,
      unit_price: product.price,
      total_price: product.price,
      merchant_sku: product.sku,
    }));

    const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0);

    const cartMandate = this.mandateManager.createCartMandate({
      user_id: userId,
      intent_mandate_id: this.currentIntentMandate.mandate.mandate_id,
      items,
      total_price: totalPrice,
      merchant: {
        merchant_id: merchant.id,
        name: merchant.name,
      },
      payment_method_id: paymentMethodId,
      shipping_address: shippingAddress,
    });

    // Validate cart mandate against intent mandate
    const validation = this.mandateManager.validateCartAgainstIntent(
      cartMandate,
      this.currentIntentMandate
    );

    if (!validation.is_valid) {
      throw new Error(
        `Cart Mandate validation failed: ${validation.errors?.join(', ')}`
      );
    }

    return cartMandate;
  }

  /**
   * AP2: Get current Intent Mandate
   */
  getCurrentIntentMandate(): SignedMandate<IntentMandate> | undefined {
    return this.currentIntentMandate;
  }

  /**
   * AP2: Verify a mandate
   */
  verifyMandate<T extends IntentMandate | CartMandate>(
    mandate: SignedMandate<T>
  ): boolean {
    const result = this.mandateManager.verifyMandate(mandate);
    return result.is_valid;
  }

  /**
   * AP2: Revoke current Intent Mandate
   */
  revokeIntentMandate(): SignedMandate<IntentMandate> | null {
    if (!this.currentIntentMandate) {
      return null;
    }

    const revokedMandate = this.mandateManager.revokeMandate(this.currentIntentMandate);
    this.currentIntentMandate = undefined;
    return revokedMandate;
  }
}

export default ShoppingAgent;
