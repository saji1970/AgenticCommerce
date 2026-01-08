import api from './api';
import {
  Mandate,
  MandateType,
  MandateStatus,
  CreateMandateRequest,
  UpdateMandateRequest,
  PurchaseIntent,
} from '@agentic-commerce/shared-types';

export interface CreateMandateParams {
  agentId: string;
  agentName: string;
  type: MandateType;
  constraints: any;
  validUntil?: Date;
}

class MandateService {
  async createMandate(params: CreateMandateParams): Promise<Mandate> {
    const request: CreateMandateRequest = {
      agentId: params.agentId,
      agentName: params.agentName,
      type: params.type,
      constraints: params.constraints,
      validUntil: params.validUntil,
    };

    const response = await api.post<{ mandate: Mandate }>('/mandates', request);
    return response.data.mandate;
  }

  async getMyMandates(status?: MandateStatus, type?: MandateType): Promise<Mandate[]> {
    const params: any = {};
    if (status) params.status = status;
    if (type) params.type = type;

    const response = await api.get<{ mandates: Mandate[] }>('/mandates', { params });
    return response.data.mandates;
  }

  async getMandate(mandateId: string): Promise<Mandate> {
    const response = await api.get<{ mandate: Mandate }>(`/mandates/${mandateId}`);
    return response.data.mandate;
  }

  async approveMandate(mandateId: string): Promise<Mandate> {
    const response = await api.post<{ mandate: Mandate }>(`/mandates/${mandateId}/approve`);
    return response.data.mandate;
  }

  async suspendMandate(mandateId: string): Promise<Mandate> {
    const response = await api.post<{ mandate: Mandate }>(`/mandates/${mandateId}/suspend`);
    return response.data.mandate;
  }

  async revokeMandate(mandateId: string, reason: string): Promise<Mandate> {
    const response = await api.post<{ mandate: Mandate }>(`/mandates/${mandateId}/revoke`, {
      reason,
    });
    return response.data.mandate;
  }

  async getPurchaseIntents(status?: string): Promise<PurchaseIntent[]> {
    const params: any = {};
    if (status) params.status = status;

    const response = await api.get<{ intents: PurchaseIntent[] }>('/acp/intents', { params });
    return response.data.intents;
  }

  async approveIntent(intentId: string): Promise<PurchaseIntent> {
    const response = await api.post<{ intent: PurchaseIntent }>(`/acp/intents/${intentId}/approve`);
    return response.data.intent;
  }

  async rejectIntent(intentId: string, reason: string): Promise<PurchaseIntent> {
    const response = await api.post<{ intent: PurchaseIntent }>(`/acp/intents/${intentId}/reject`, {
      reason,
    });
    return response.data.intent;
  }

  async getAgentActions(agentId?: string, limit?: number): Promise<any[]> {
    const params: any = {};
    if (agentId) params.agentId = agentId;
    if (limit) params.limit = limit;

    const response = await api.get<{ actions: any[] }>('/acp/actions', { params });
    return response.data.actions;
  }
}

export default new MandateService();
