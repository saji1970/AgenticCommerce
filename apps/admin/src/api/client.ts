import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('adminToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('adminToken');
  },
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },
  getAlerts: async () => {
    const response = await apiClient.get('/admin/dashboard/alerts');
    return response.data;
  },
};

// Merchants API
export const merchantsApi = {
  getAll: async (params?: { status?: string; limit?: number; offset?: number; search?: string }) => {
    const response = await apiClient.get('/admin/merchants', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/admin/merchants/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    businessName: string;
    email: string;
    website?: string;
    tier: string;
    webhookUrl?: string;
  }) => {
    const response = await apiClient.post('/admin/merchants', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/admin/merchants/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.put(`/admin/merchants/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/admin/merchants/${id}`);
    return response.data;
  },
  getAgents: async (merchantId: string) => {
    const response = await apiClient.get(`/admin/merchants/${merchantId}/agents`);
    return response.data;
  },
  addAgent: async (merchantId: string, agentId: string, config?: Record<string, unknown>) => {
    const response = await apiClient.post(`/admin/merchants/${merchantId}/agents`, { agentId, config });
    return response.data;
  },
  updateAgentConfig: async (merchantId: string, agentId: string, config: Record<string, unknown>) => {
    const response = await apiClient.put(`/admin/merchants/${merchantId}/agents/${agentId}`, { config });
    return response.data;
  },
  removeAgent: async (merchantId: string, agentId: string) => {
    const response = await apiClient.delete(`/admin/merchants/${merchantId}/agents/${agentId}`);
    return response.data;
  },
  rotateKeys: async (merchantId: string) => {
    const response = await apiClient.post(`/admin/merchants/${merchantId}/rotate-keys`);
    return response.data;
  },
};

// Agents API
export const agentsApi = {
  getAll: async (params?: { status?: string }) => {
    const response = await apiClient.get('/admin/agents', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/admin/agents/${id}`);
    return response.data;
  },
  getMonitoring: async (agentId: string, days?: number) => {
    const response = await apiClient.get(`/admin/agents/${agentId}/monitoring`, { params: { days } });
    return response.data;
  },
  getAuditability: async (agentId: string, params?: Record<string, unknown>) => {
    const response = await apiClient.get(`/admin/agents/${agentId}/auditability`, { params });
    return response.data;
  },
  getTransactions: async (agentId: string, params?: Record<string, unknown>) => {
    const response = await apiClient.get(`/admin/agents/${agentId}/transactions`, { params });
    return response.data;
  },
  getCertificates: async (agentId: string) => {
    const response = await apiClient.get(`/admin/agents/${agentId}/certificates`);
    return response.data;
  },
  uploadCertificate: async (agentId: string, certificatePem: string) => {
    const response = await apiClient.post(`/admin/agents/${agentId}/certificates`, { certificatePem });
    return response.data;
  },
};

// Certificates API
export const certificatesApi = {
  getAll: async (params?: { limit?: number; offset?: number }) => {
    const response = await apiClient.get('/admin/certificates', { params });
    return response.data;
  },
  getExpiring: async (days?: number) => {
    const response = await apiClient.get('/admin/certificates/expiring', { params: { days } });
    return response.data;
  },
  revoke: async (id: string, reason: string) => {
    const response = await apiClient.post(`/admin/certificates/${id}/revoke`, { reason });
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (params?: { limit?: number; offset?: number; search?: string }) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },
  getSettings: async (userId: string) => {
    const response = await apiClient.get(`/admin/users/${userId}/settings`);
    return response.data;
  },
  updateSettings: async (userId: string, settings: {
    defaultMaxTransaction?: number;
    defaultDailyLimit?: number;
    defaultMonthlyLimit?: number;
  }) => {
    const response = await apiClient.put(`/admin/users/${userId}/settings`, settings);
    return response.data;
  },
  block: async (userId: string, reason: string) => {
    const response = await apiClient.put(`/admin/users/${userId}/block`, { reason });
    return response.data;
  },
  unblock: async (userId: string) => {
    const response = await apiClient.put(`/admin/users/${userId}/unblock`);
    return response.data;
  },
};

// Audit Logs API
export const auditLogsApi = {
  getAll: async (params?: {
    limit?: number;
    offset?: number;
    action?: string;
    resourceType?: string;
    adminUserId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },
};

// Mandates API (admin view)
export const mandatesApi = {
  getAll: async (params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/admin/mandates', { params });
    return response.data;
  },
};

// Intents API (admin view)
export const intentsApi = {
  getAll: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/admin/intents', { params });
    return response.data;
  },
};

// AP2 Transactions API (admin view)
export const ap2Api = {
  getAll: async (params?: { status?: string; type?: string; merchantId?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/admin/ap2/transactions', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/admin/ap2/transactions/${id}`);
    return response.data;
  },
};

// Admin Settings API
export const settingsApi = {
  getAll: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },
  getByCategory: async (category: string) => {
    const response = await apiClient.get(`/admin/settings/${category}`);
    return response.data;
  },
  update: async (updates: Array<{ category: string; key: string; value: unknown }>) => {
    const response = await apiClient.put('/admin/settings', { updates });
    return response.data;
  },
};
