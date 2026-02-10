import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = '/api/v1/admin';

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

// Auth API (now points to mandate-service admin auth)
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
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },
  getAlerts: async () => {
    // No alerts endpoint yet, return empty
    return { alerts: [] };
  },
};

// Merchants API
export const merchantsApi = {
  getAll: async (params?: { status?: string; limit?: number; offset?: number; search?: string }) => {
    const response = await apiClient.get('/merchants', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/merchants/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    slug?: string;
    description?: string;
    webhookUrl?: string;
  }) => {
    const response = await apiClient.post('/merchants', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/merchants/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.put(`/merchants/${id}/status`, { status });
    return response.data;
  },
  getAgents: async (merchantId: string) => {
    const response = await apiClient.get(`/merchants/${merchantId}/agents`);
    return response.data;
  },
  addAgent: async (merchantId: string, data: Record<string, unknown>) => {
    const response = await apiClient.post(`/merchants/${merchantId}/agents`, data);
    return response.data;
  },
  getAgent: async (merchantId: string, agentId: string) => {
    const response = await apiClient.get(`/merchants/${merchantId}/agents/${agentId}`);
    return response.data;
  },
  updateAgent: async (merchantId: string, agentId: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/merchants/${merchantId}/agents/${agentId}`, data);
    return response.data;
  },
  deleteAgent: async (merchantId: string, agentId: string) => {
    const response = await apiClient.delete(`/merchants/${merchantId}/agents/${agentId}`);
    return response.data;
  },
  rotateKeys: async (merchantId: string) => {
    const response = await apiClient.post(`/merchants/${merchantId}/rotate-keys`);
    return response.data;
  },
};

// Admin Users API (new)
export const adminUsersApi = {
  getAll: async (params?: { role?: string; merchantId?: string; status?: string }) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  create: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    merchantId?: string | null;
  }) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },
  deactivate: async (id: string) => {
    const response = await apiClient.put(`/users/${id}/deactivate`);
    return response.data;
  },
};

// Mandates API (admin view)
export const mandatesApi = {
  getAll: async (params?: { status?: string; type?: string; agentId?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/mandates', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/mandates/${id}`);
    return response.data;
  },
  revoke: async (id: string, reason?: string) => {
    const response = await apiClient.put(`/mandates/${id}/revoke`, { reason });
    return response.data;
  },
  suspend: async (id: string) => {
    const response = await apiClient.put(`/mandates/${id}/suspend`);
    return response.data;
  },
  reactivate: async (id: string) => {
    const response = await apiClient.put(`/mandates/${id}/reactivate`);
    return response.data;
  },
};

// Transactions API (admin view)
export const transactionsApi = {
  getAll: async (params?: { status?: string; type?: string; agentId?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/transactions', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/transactions/${id}`);
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
    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  },
};

// Agents API (kept for compatibility)
export const agentsApi = {
  getAll: async (_params?: { status?: string }) => {
    return { agents: [] };
  },
  getById: async (_id: string) => {
    return { agent: null };
  },
  getAuditability: async (_agentId: string, _params?: Record<string, unknown>) => {
    return { actions: [], pagination: { total: 0, limit: 10, offset: 0 } };
  },
  getMonitoring: async (_agentId: string, _days?: number) => {
    return { agent: null, monitoring: null };
  },
  getTransactions: async (_agentId: string, _params?: Record<string, unknown>) => {
    return { transactions: [] };
  },
  getCertificates: async (_agentId: string) => {
    return { certificates: [] };
  },
  uploadCertificate: async (_agentId: string, _certificatePem: string) => {
    return { success: true };
  },
};

// Intents API (kept for compatibility)
export const intentsApi = {
  getAll: async (_params?: { status?: string; agentId?: string; limit?: number; offset?: number }) => {
    return { intents: [], pagination: { total: 0, limit: 10, offset: 0 } };
  },
};

// AP2 Transactions API (kept for compatibility)
export const ap2Api = {
  getAll: async (_params?: { status?: string; type?: string; merchantId?: string; agentId?: string; limit?: number; offset?: number }) => {
    return { transactions: [], pagination: { total: 0, limit: 10, offset: 0 } };
  },
  getById: async (_id: string) => {
    return { transaction: null };
  },
};

// Certificates API (kept for compatibility)
export const certificatesApi = {
  getAll: async (_params?: { limit?: number; offset?: number }) => {
    return { certificates: [], pagination: { total: 0, limit: 10, offset: 0 } };
  },
  getExpiring: async (_days?: number) => {
    return { certificates: [] };
  },
  revoke: async (_id: string, _reason: string) => {
    return { success: true };
  },
};

// Users API (end users - kept for compatibility, returns empty since they're in backend DB)
export const usersApi = {
  getAll: async (_params?: { limit?: number; offset?: number; search?: string }) => {
    return { users: [], pagination: { total: 0, limit: 10, offset: 0 } };
  },
  getById: async (_id: string) => {
    return { user: null, mandates: [], intents: [] };
  },
  getSettings: async (_userId: string) => {
    return { settings: null };
  },
  updateSettings: async (_userId: string, _settings: Record<string, unknown>) => {
    return { success: true };
  },
  block: async (_userId: string, _reason: string) => {
    return { success: true };
  },
  unblock: async (_userId: string) => {
    return { success: true };
  },
};

// Settings API (kept for compatibility)
export const settingsApi = {
  getAll: async () => {
    return { settings: {} };
  },
  getByCategory: async (_category: string) => {
    return { settings: {} };
  },
  update: async (_updates: Array<{ category: string; key: string; value: unknown }>) => {
    return { success: true };
  },
};
