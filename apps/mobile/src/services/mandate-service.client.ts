import axios, { AxiosInstance, AxiosError } from 'axios';

// Mandate Service API Configuration
// Always use production URL — 10.0.2.2 only works on Android emulator, not physical devices
const MANDATE_SERVICE_URL = 'https://pure-wonder-production.up.railway.app/api';

export interface AgentMandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment' | 'app';
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  constraints: Record<string, any>;
  parentMandateId?: string;
  paymentMethods?: any[];
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterMandateRequest {
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment' | 'app';
  constraints?: Record<string, any>;
  parentMandateId?: string;
  paymentMethods?: any[];
  validUntil?: string;
}

export interface ValidateMandateRequest {
  userId: string;
  agentId: string;
  mandateType: 'cart' | 'intent' | 'payment' | 'app';
  transactionAmount?: number;
}

export interface CreateCheckoutMandateRequest {
  userId: string;
  agentId: string;
  agentName: string;
  paymentMethod: Record<string, any>;
  maxAmountPerPayment: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  expiryDate?: string;
  appMandateId?: string;
  constraints?: Record<string, any>;
}

export interface CheckoutUsage {
  amountUsedToday: number;
  amountUsedMonth: number;
  transactionsToday: number;
  remainingToday: number | null;
  remainingMonth: number | null;
  maxAmountPerPayment: number;
}

export interface CheckoutTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  transactionId?: string;
  description?: string;
  createdAt: string;
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
   * Get user's app mandates
   */
  async getUserAppMandates(userId: string): Promise<AgentMandate[]> {
    const response = await this.client.get<{ success: boolean; data: AgentMandate[] }>(
      '/mandates/app',
      { params: { userId } }
    );
    return response.data.data;
  }

  /**
   * Register an app mandate
   */
  async registerAppMandate(data: Omit<RegisterMandateRequest, 'type'>): Promise<AgentMandate> {
    return this.registerMandate({ ...data, type: 'app' });
  }

  /**
   * Create a checkout payment mandate
   */
  async createCheckoutMandate(data: CreateCheckoutMandateRequest): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      '/mandates/checkout',
      data
    );
    return response.data.data;
  }

  /**
   * Get user's checkout mandates
   */
  async getUserCheckoutMandates(userId: string, status?: string): Promise<AgentMandate[]> {
    const params: any = {};
    if (status) params.status = status;
    const response = await this.client.get<{ success: boolean; data: AgentMandate[] }>(
      `/mandates/checkout/user/${userId}`,
      { params }
    );
    return response.data.data;
  }

  /**
   * Approve a checkout mandate — returns mandate and consent token
   */
  async approveCheckoutMandate(mandateId: string, userId: string): Promise<{ mandate: AgentMandate; consentToken?: string }> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate; consentToken?: string }>(
      `/mandates/checkout/${mandateId}/approve`,
      { userId }
    );
    return {
      mandate: response.data.data,
      consentToken: response.data.consentToken,
    };
  }

  /**
   * Revoke a checkout mandate
   */
  async revokeCheckoutMandate(mandateId: string, userId: string, reason?: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/checkout/${mandateId}/revoke`,
      { userId, reason }
    );
    return response.data.data;
  }

  /**
   * Get checkout mandate usage stats
   */
  async getCheckoutUsage(mandateId: string): Promise<CheckoutUsage> {
    const response = await this.client.get<{ success: boolean; data: CheckoutUsage }>(
      `/mandates/checkout/${mandateId}/usage`
    );
    return response.data.data;
  }

  /**
   * Get checkout mandate transactions
   */
  async getCheckoutTransactions(mandateId: string): Promise<{ transactions: CheckoutTransaction[]; total: number }> {
    const response = await this.client.get<{ success: boolean; data: CheckoutTransaction[]; total: number }>(
      `/mandates/checkout/${mandateId}/transactions`
    );
    return { transactions: response.data.data || [], total: response.data.total || 0 };
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
