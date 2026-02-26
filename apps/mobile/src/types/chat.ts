import { Product } from '@agentic-commerce/shared-types';

export type ChatMessageType =
  | 'user'
  | 'ai_text'
  | 'ai_products'
  | 'ai_see_all'
  | 'ai_error'
  | 'ai_typing'
  | 'ai_mandate';

export interface ParsedQuerySummary {
  type?: string;
  productType?: string;
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  startDate?: string;
  endDate?: string;
  passengers?: number;
  category?: string;
  query?: string;
}

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  text?: string;
  products?: Product[];
  allProducts?: Product[];
  parsedQuery?: ParsedQuerySummary;
  searchQueryId?: string;
  intentCreated?: {
    type: string;
    reasoning?: string;
  };
  mandateCreated?: {
    status: string;
    constraints: {
      maxIntentValue?: number;
      autoApproveUnder?: number;
      maxIntentsPerDay?: number;
    };
  };
  originalQuery?: string;
  timestamp: Date;
}
