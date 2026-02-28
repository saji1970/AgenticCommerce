import axios, { AxiosInstance } from 'axios';

// Payment Gateway API Configuration
// Dev: direct to local payment-gateway. Prod: use backend proxy (avoids 404 if payment-gateway URL differs)
const PAYMENT_GATEWAY_URL = __DEV__
  ? 'http://10.0.2.2:3002/api' // Local payment-gateway
  : 'https://agenticcommerce-production.up.railway.app/api'; // Backend proxies /api/vrp to payment-gateway

export interface VrpConsent {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  paymentMethod: Record<string, any>;
  maxAmountPerPayment: number;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  expiryDate: string | null;
  amountUsedToday: number;
  amountUsedMonth: number;
  transactionsToday: number;
  consentToken: string | null;
  constraints: Record<string, any>;
  appMandateId: string | null;
  merchantId: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface VrpUsage {
  amountUsedToday: number;
  amountUsedMonth: number;
  transactionsToday: number;
  remainingToday: number | null;
  remainingMonth: number | null;
  maxAmountPerPayment: number;
}

export interface CreateVrpConsentRequest {
  userId: string;
  agentId: string;
  agentName: string;
  paymentMethod: Record<string, any>;
  maxAmountPerPayment: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  expiryDate?: string;
  constraints?: Record<string, any>;
  appMandateId?: string;
  merchantId?: string;
}

export interface VrpTransaction {
  id: string;
  consentId: string;
  userId: string;
  agentId: string;
  amount: number;
  currency: string;
  status: string;
  transactionId?: string;
  description?: string;
  metadata?: Record<string, any>;
  mandateId?: string;
  appMandateId?: string;
  cartId?: string;
  intentId?: string;
  merchantId?: string;
  productInfo?: Record<string, any>;
  createdAt: string;
  processedAt?: string;
}

class PaymentGatewayClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: PAYMENT_GATEWAY_URL,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async createConsent(data: CreateVrpConsentRequest): Promise<VrpConsent> {
    const response = await this.client.post<{ success: boolean; data: VrpConsent }>('/vrp/consents', data);
    return response.data.data;
  }

  async getUserConsents(userId: string, status?: string): Promise<VrpConsent[]> {
    const params: any = {};
    if (status) params.status = status;
    const response = await this.client.get<{ success: boolean; data: VrpConsent[] }>(`/vrp/consents/user/${userId}`, { params });
    return response.data.data;
  }

  async getConsent(id: string): Promise<VrpConsent> {
    const response = await this.client.get<{ success: boolean; data: VrpConsent }>(`/vrp/consents/${id}`);
    return response.data.data;
  }

  async approveConsent(id: string, userId: string): Promise<{ consent: VrpConsent; consentToken: string }> {
    const response = await this.client.post<{ success: boolean; data: VrpConsent; consentToken: string }>(
      `/vrp/consents/${id}/approve`,
      { userId }
    );
    return { consent: response.data.data, consentToken: response.data.consentToken };
  }

  async revokeConsent(id: string, userId: string, reason?: string): Promise<VrpConsent> {
    const response = await this.client.post<{ success: boolean; data: VrpConsent }>(
      `/vrp/consents/${id}/revoke`,
      { userId, reason }
    );
    return response.data.data;
  }

  async getUsage(id: string): Promise<VrpUsage> {
    const response = await this.client.get<{ success: boolean; data: VrpUsage }>(`/vrp/consents/${id}/usage`);
    return response.data.data;
  }

  async getTransactions(consentId: string, limit = 50, offset = 0): Promise<{ transactions: VrpTransaction[]; total: number }> {
    const response = await this.client.get<{ success: boolean; data: VrpTransaction[]; total: number }>(
      `/vrp/consents/${consentId}/transactions`,
      { params: { limit, offset } }
    );
    return { transactions: response.data.data || [], total: response.data.total || 0 };
  }

  async validateToken(token: string): Promise<{ valid: boolean; consent?: VrpConsent; error?: string }> {
    const response = await this.client.post<{ success: boolean; data: any }>('/vrp/validate-token', { token });
    return response.data.data;
  }
}

export const paymentGatewayClient = new PaymentGatewayClient();
export default paymentGatewayClient;
