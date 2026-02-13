import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

export interface AgentMandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment';
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  constraints: Record<string, any>;
  validFrom: string;
  validUntil?: string;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterMandateRequest {
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment';
  constraints?: Record<string, any>;
  validUntil?: string;
}

export interface ValidateMandateRequest {
  userId: string;
  agentId: string;
  mandateType: 'cart' | 'intent' | 'payment';
  transactionAmount?: number;
}

/**
 * HTTP Client for Mandate Service API
 * Connects AgenticCommerce backend to the separate mandate-service deployment
 */
class MandateServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.mandateService.url;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Add admin token if configured
    if (config.mandateService.adminToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.mandateService.adminToken}`;
    }
  }

  /**
   * Register a mandate (called by agents or app)
   */
  async registerMandate(data: RegisterMandateRequest): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      '/mandates/register',
      data
    );
    if (!response.data.success) {
      throw new Error('Failed to register mandate');
    }
    return response.data.data;
  }

  /**
   * Get user mandates
   */
  async getUserMandates(
    userId: string,
    status?: string,
    type?: string
  ): Promise<AgentMandate[]> {
    const params: any = { userId };
    if (status) params.status = status;
    if (type) params.type = type;

    const response = await this.client.get<{ success: boolean; data: AgentMandate[] }>(
      '/mandates',
      { params }
    );
    if (!response.data.success) {
      throw new Error('Failed to get user mandates');
    }
    return response.data.data;
  }

  /**
   * Get specific mandate
   */
  async getMandate(mandateId: string): Promise<AgentMandate> {
    const response = await this.client.get<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}`
    );
    if (!response.data.success) {
      throw new Error('Mandate not found');
    }
    return response.data.data;
  }

  /**
   * Approve mandate
   */
  async approveMandate(mandateId: string, userId: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}/approve`,
      { userId }
    );
    if (!response.data.success) {
      throw new Error('Failed to approve mandate');
    }
    return response.data.data;
  }

  /**
   * Suspend mandate
   */
  async suspendMandate(mandateId: string, userId: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}/suspend`,
      { userId }
    );
    if (!response.data.success) {
      throw new Error('Failed to suspend mandate');
    }
    return response.data.data;
  }

  /**
   * Revoke mandate
   */
  async revokeMandate(mandateId: string, userId: string, reason?: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}/revoke`,
      { userId, reason }
    );
    if (!response.data.success) {
      throw new Error('Failed to revoke mandate');
    }
    return response.data.data;
  }

  /**
   * Validate mandate for transaction (called by agents before transactions)
   */
  async validateMandate(data: ValidateMandateRequest): Promise<{ valid: boolean; mandate?: AgentMandate }> {
    try {
      const response = await this.client.post<{ success: boolean; valid: boolean; data: any }>(
        '/mandates/validate',
        data
      );
      return {
        valid: response.data.success && response.data.valid !== false,
        mandate: response.data.data?.mandate,
      };
    } catch (error: any) {
      if (error.response?.data?.valid === false || error.response?.data?.success === false) {
        return { valid: false };
      }
      throw error;
    }
  }
  /**
   * Validate a mandate token against cart data (called during checkout)
   */
  async validateMandateToken(
    token: string,
    cartData?: { items: any[]; total: number }
  ): Promise<{ valid: boolean; errors?: string[]; mandate?: any }> {
    try {
      const response = await this.client.post<{ success: boolean; valid: boolean; errors?: string[]; mandate?: any }>(
        '/mandates/validate-token',
        { token, cartData }
      );
      return {
        valid: response.data.valid,
        errors: response.data.errors,
        mandate: response.data.mandate,
      };
    } catch (error: any) {
      if (error.response?.data) {
        return {
          valid: false,
          errors: error.response.data.errors || [error.response.data.error || 'Token validation failed'],
        };
      }
      throw error;
    }
  }
}

export const mandateServiceClient = new MandateServiceClient();
export default mandateServiceClient;
