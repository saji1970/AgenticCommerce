import Anthropic from '@anthropic-ai/sdk';
import { AgentMessage, AgentContext, Product } from '@agentic-commerce/shared';
import { MCPClient } from '@agentic-commerce/mcp-client';

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
}

export class ShoppingAgent {
  private client: Anthropic;
  private mcpClient: MCPClient;
  private model: string;
  private maxTokens: number;

  constructor(config: AgentConfig, mcpClient: MCPClient) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.mcpClient = mcpClient;
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
}

export default ShoppingAgent;
