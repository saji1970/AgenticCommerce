import axios, { AxiosInstance } from 'axios';

// Payment Gateway API Configuration
const PAYMENT_GATEWAY_URL = __DEV__
  ? 'http://10.0.2.2:3002/api' // Local payment-gateway
  : 'https://payment-gateway-production.up.railway.app/api'; // Railway payment-gateway

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

  async validateToken(token: string): Promise<{ valid: boolean; consent?: VrpConsent; error?: string }> {
    const response = await this.client.post<{ success: boolean; data: any }>('/vrp/validate-token', { token });
    return response.data.data;
  }
}

export const paymentGatewayClient = new PaymentGatewayClient();
export default paymentGatewayClient;
