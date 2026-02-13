import axios, { AxiosInstance, AxiosError } from 'axios';

// Mandate Service API Configuration
const MANDATE_SERVICE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api' // Local mandate-service
  : 'https://pure-wonder-production.up.railway.app/api'; // Railway mandate-service

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

class MandateServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: MANDATE_SERVICE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Register a mandate (called by agents or app)
   */
  async registerMandate(data: RegisterMandateRequest): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      '/mandates/register',
      data
    );
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
    return response.data.data;
  }

  /**
   * Get specific mandate
   */
  async getMandate(mandateId: string): Promise<AgentMandate> {
    const response = await this.client.get<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}`
    );
    return response.data.data;
  }

  /**
   * Approve mandate - returns mandate and optional mandate token for checkout validation
   */
  async approveMandate(mandateId: string, userId: string): Promise<{ mandate: AgentMandate; mandateToken?: string }> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate; mandateToken?: string }>(
      `/mandates/${mandateId}/approve`,
      { userId }
    );
    return {
      mandate: response.data.data,
      mandateToken: response.data.mandateToken,
    };
  }

  /**
   * Suspend mandate
   */
  async suspendMandate(mandateId: string, userId: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}/suspend`,
      { userId }
    );
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
    return response.data.data;
  }

  /**
   * Validate mandate for transaction (called by agents before transactions)
   */
  async validateMandate(data: ValidateMandateRequest): Promise<{ valid: boolean; mandate?: any }> {
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
      if (error.response?.data?.valid === false) {
        return { valid: false };
      }
      throw error;
    }
  }
}

export const mandateServiceClient = new MandateServiceClient();
export default mandateServiceClient;
