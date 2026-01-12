/**
 * Agentic Commerce Protocol (ACP) Service
 * Handles all agent-related API operations
 */

import {
  AgentCartRequest,
  CreateIntentRequest,
  PurchaseIntent,
  AgentActionLog,
} from '@agentic-commerce/shared-types';
import { CartItem } from '@agentic-commerce/shared-types';
import { apiClient } from './api';

export const acpService = {
  /**
   * Agent adds item to user's cart
   * Requires active cart mandate
   */
  async agentAddToCart(request: AgentCartRequest): Promise<CartItem> {
    const response = await apiClient.post<{ cart_item: CartItem }>(
      '/acp/cart/add',
      request
    );
    return response.cart_item;
  },

  /**
   * Create a purchase intent
   * Requires active intent mandate
   */
  async createIntent(request: CreateIntentRequest): Promise<PurchaseIntent> {
    const response = await apiClient.post<{ intent: PurchaseIntent }>(
      '/acp/intents',
      request
    );
    return response.intent;
  },

  /**
   * Get user's purchase intents
   * Optionally filter by status
   */
  async getUserIntents(status?: string): Promise<PurchaseIntent[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get<{ intents: PurchaseIntent[] }>(
      `/acp/intents${params}`
    );
    return response.intents;
  },

  /**
   * Get pending intents (requires user approval)
   */
  async getPendingIntents(): Promise<PurchaseIntent[]> {
    return this.getUserIntents('pending');
  },

  /**
   * Approve a purchase intent
   */
  async approveIntent(intentId: string): Promise<PurchaseIntent> {
    const response = await apiClient.post<{ intent: PurchaseIntent }>(
      `/acp/intents/${intentId}/approve`
    );
    return response.intent;
  },

  /**
   * Reject a purchase intent
   */
  async rejectIntent(intentId: string, reason: string): Promise<PurchaseIntent> {
    const response = await apiClient.post<{ intent: PurchaseIntent }>(
      `/acp/intents/${intentId}/reject`,
      { reason }
    );
    return response.intent;
  },

  /**
   * Get agent action logs for audit trail
   */
  async getAgentActions(agentId?: string, limit: number = 20): Promise<AgentActionLog[]> {
    const params = new URLSearchParams();
    if (agentId) params.append('agentId', agentId);
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/acp/actions?${queryString}` : '/acp/actions';

    const response = await apiClient.get<{ actions: AgentActionLog[] }>(url);
    return response.actions;
  },
};
