import { apiService } from './api';

interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    budget?: number;
    category?: string;
    preferredRetailers?: string[];
    urgency?: 'low' | 'medium' | 'high';
  };
}

interface ChatResponse {
  sessionId: string;
  response: string;
  suggestions: string[];
  products?: any[];
}

class AgentService {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return await apiService.post<ChatResponse>('/agent/chat', request);
  }

  async getSession(sessionId: string) {
    return await apiService.get(`/agent/sessions/${sessionId}`);
  }

  async getSessions() {
    return await apiService.get('/agent/sessions');
  }

  async searchProducts(query: string) {
    return await apiService.post('/agent/search', { query });
  }

  async compareProducts(productIds: string[]) {
    return await apiService.post('/agent/compare', { productIds });
  }
}

export const agentService = new AgentService();

