export interface AgentSession {
  id: string;
  userId: string;
  messages: AgentMessage[];
  context: AgentContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    products?: string[];
    searchQuery?: string;
    recommendations?: any[];
  };
  timestamp: Date;
}

export interface AgentContext {
  budget?: number;
  category?: string;
  preferredRetailers?: string[];
  urgency?: 'low' | 'medium' | 'high';
  shoppingIntent?: ShoppingIntent;
}

export enum ShoppingIntent {
  BROWSE = 'browse',
  SEARCH = 'search',
  COMPARE = 'compare',
  PURCHASE = 'purchase',
  TRACK = 'track',
}

export interface AgentRecommendation {
  productId: string;
  score: number;
  reasoning: string;
  alternatives: string[];
}

export interface AgentAction {
  type: AgentActionType;
  payload: any;
  timestamp: Date;
}

export enum AgentActionType {
  SEARCH_PRODUCTS = 'search_products',
  COMPARE_PRODUCTS = 'compare_products',
  GET_REVIEWS = 'get_reviews',
  CHECK_PRICE_HISTORY = 'check_price_history',
  INITIATE_PURCHASE = 'initiate_purchase',
  TRACK_ORDER = 'track_order',
}
