import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { certificateManagerService } from './certificate-manager.service';
import { cryptoService } from './crypto.service';
import { getTestServerPublicKey, isTestCertificateFingerprint } from './test-certificate-generator';

// Mandate Service API Configuration
const MANDATE_SERVICE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api' // Local mandate-service
  : 'https://pure-wonder-production.up.railway.app/api'; // Railway mandate-service

// Flag to enable/disable secure payload encryption
const ENABLE_SECURE_PAYLOAD = false;

export interface AgentMandate {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  type: 'cart' | 'intent' | 'payment' | 'app';
  status: 'pending' | 'active' | 'completed' | 'suspended' | 'revoked' | 'expired';
  constraints: Record<string, any>;
  parentMandateId?: string;
  paymentMethods?: any[];
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'inactive';
  apiKey?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AIAgentApp {
  id: string;
  name: string;
  slug: string;
  description?: string;
  agentId: string;
  agentName: string;
  apiEndpoint?: string;
  capabilities: string[];
  status: 'active' | 'inactive';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMerchantRequest {
  name: string;
  slug: string;
  description?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreateAgentAppRequest {
  name: string;
  slug: string;
  description?: string;
  agentId: string;
  agentName: string;
  apiEndpoint?: string;
  apiKey?: string;
  capabilities: string[];
  metadata?: Record<string, any>;
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

class MandateServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: MANDATE_SERVICE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for secure payload encryption
    this.setupSecurePayloadInterceptor();
  }

  /**
   * Setup request interceptor to encrypt and sign payloads when CA is configured
   */
  private setupSecurePayloadInterceptor() {
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Only process POST/PUT requests with data
        if (!ENABLE_SECURE_PAYLOAD || !config.data || (config.method !== 'post' && config.method !== 'put')) {
          return config;
        }

        try {
          // Check if CA certificate is configured
          const isCAConfigured = await certificateManagerService.isCAConfigured();
          const cert = await certificateManagerService.getCertificate();

          if (!cert) {
            // No certificate, send as plain data
            return config;
          }

          // Get server public key for encryption
          let serverPublicKey = await certificateManagerService.getServerPublicKey();

          // In test mode, use test server public key if not configured
          if (!serverPublicKey && (cert.isTestMode || isTestCertificateFingerprint(cert.fingerprint))) {
            serverPublicKey = getTestServerPublicKey();
          }

          if (!serverPublicKey) {
            console.log('[MandateServiceClient] No server public key, skipping encryption');
            return config;
          }

          // Create secure payload (encrypted and signed)
          const securePayload = cryptoService.createSecurePayload(
            config.data,
            serverPublicKey,
            cert.privateKeyPem,
            cert.fingerprint
          );

          // Replace request data with secure payload
          config.data = securePayload;

          // Add secure payload headers
          config.headers = config.headers || {};
          config.headers['X-Secure-Payload'] = 'true';
          config.headers['X-Certificate-Fingerprint'] = cert.fingerprint;

          // Mark test mode in header for backend to handle appropriately
          if (cert.isTestMode || isTestCertificateFingerprint(cert.fingerprint)) {
            config.headers['X-Test-Mode'] = 'true';
          }

          console.log('[MandateServiceClient] Request encrypted with certificate:', cert.fingerprint.substring(0, 20) + '...');
        } catch (error) {
          console.error('[MandateServiceClient] Error encrypting request:', error);
          // On error, continue with unencrypted request
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // ========== MERCHANTS ==========
  
  async getAllMerchants(): Promise<Merchant[]> {
    const response = await this.client.get<{ success: boolean; data: Merchant[] }>('/merchants');
    return response.data.data;
  }

  async getMerchant(id: string): Promise<Merchant> {
    const response = await this.client.get<{ success: boolean; data: Merchant }>(`/merchants/${id}`);
    return response.data.data;
  }

  async createMerchant(data: CreateMerchantRequest): Promise<Merchant> {
    const response = await this.client.post<{ success: boolean; data: Merchant }>('/merchants', data);
    return response.data.data;
  }

  async updateMerchant(id: string, data: Partial<CreateMerchantRequest>): Promise<Merchant> {
    const response = await this.client.put<{ success: boolean; data: Merchant }>(`/merchants/${id}`, data);
    return response.data.data;
  }

  async deleteMerchant(id: string): Promise<void> {
    await this.client.delete(`/merchants/${id}`);
  }

  // ========== AI AGENT APPS ==========

  async getAllAgentApps(activeOnly?: boolean): Promise<AIAgentApp[]> {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await this.client.get<{ success: boolean; data: AIAgentApp[] }>('/ai-agent-apps', { params });
    return response.data.data;
  }

  async getAgentApp(id: string): Promise<AIAgentApp> {
    const response = await this.client.get<{ success: boolean; data: AIAgentApp }>(`/ai-agent-apps/${id}`);
    return response.data.data;
  }

  async createAgentApp(data: CreateAgentAppRequest): Promise<AIAgentApp> {
    const response = await this.client.post<{ success: boolean; data: AIAgentApp }>('/ai-agent-apps', data);
    return response.data.data;
  }

  async updateAgentApp(id: string, data: Partial<CreateAgentAppRequest>): Promise<AIAgentApp> {
    const response = await this.client.put<{ success: boolean; data: AIAgentApp }>(`/ai-agent-apps/${id}`, data);
    return response.data.data;
  }

  async deleteAgentApp(id: string): Promise<void> {
    await this.client.delete(`/ai-agent-apps/${id}`);
  }

  // ========== MANDATES ==========

  async registerMandate(data: RegisterMandateRequest): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>('/mandates/register', data);
    return response.data.data;
  }

  async getUserMandates(userId: string, status?: string, type?: string): Promise<AgentMandate[]> {
    const params: any = { userId };
    if (status) params.status = status;
    if (type) params.type = type;

    const response = await this.client.get<{ success: boolean; data: AgentMandate[] }>('/mandates', { params });
    return response.data.data;
  }

  async getMandate(mandateId: string): Promise<AgentMandate> {
    const response = await this.client.get<{ success: boolean; data: AgentMandate }>(`/mandates/${mandateId}`);
    return response.data.data;
  }

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

  async suspendMandate(mandateId: string, userId: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}/suspend`,
      { userId }
    );
    return response.data.data;
  }

  async revokeMandate(mandateId: string, userId: string, reason?: string): Promise<AgentMandate> {
    const response = await this.client.post<{ success: boolean; data: AgentMandate }>(
      `/mandates/${mandateId}/revoke`,
      { userId, reason }
    );
    return response.data.data;
  }

  // ========== SIGNATURES ==========

  async registerPublicKey(data: {
    userId: string;
    publicKeyPem: string;
    keyId: string;
    keyAlgorithm?: string;
    deviceId?: string;
    attestationData?: Record<string, any>;
  }): Promise<{ id: string; keyId: string; userId: string; createdAt: string }> {
    const response = await this.client.post<{ success: boolean; data: any }>('/signatures/keys/register', data);
    return response.data.data;
  }

  async getUserPublicKeys(userId: string): Promise<any[]> {
    const response = await this.client.get<{ success: boolean; data: any[] }>('/signatures/keys', {
      params: { userId },
    });
    return response.data.data;
  }

  async createSignature(data: {
    mandateId: string;
    userId: string;
    publicKeyId: string;
    mandateText: string;
    mandateHash: string;
    signatureData: string;
    signatureImageUrl?: string;
    signatureTimestamp: string;
    deviceInfo?: Record<string, any>;
    biometricType?: string;
  }): Promise<any> {
    const response = await this.client.post<{ success: boolean; data: any }>('/signatures/create', data);
    return response.data.data;
  }

  async getSignatureByMandate(mandateId: string): Promise<any | null> {
    try {
      const response = await this.client.get<{ success: boolean; data: any }>(`/signatures/mandate/${mandateId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async processPayment(data: {
    userId: string;
    agentId: string;
    mandateId: string;
    amount: number;
    currency?: string;
    paymentMethod?: string;
    cardDetails?: any;
    paypalDetails?: any;
    metadata?: Record<string, any>;
  }): Promise<{ transactionId: string; status: string; amount: number; currency: string; processedAt: string; gateway: string }> {
    const response = await this.client.post<{ success: boolean; data: any }>('/payment/process', data);
    return response.data.data;
  }
}

export const mandateServiceClient = new MandateServiceClient();
export default mandateServiceClient;
