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

    return await api.post<Mandate>('/mandates', request);
  }

  async getMyMandates(status?: MandateStatus, type?: MandateType): Promise<Mandate[]> {
    const params: any = {};
    if (status) params.status = status;
    if (type) params.type = type;

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/mandates?${queryString}` : '/mandates';
    return await api.get<Mandate[]>(url);
  }

  async getMandate(mandateId: string): Promise<Mandate> {
    return await api.get<Mandate>(`/mandates/${mandateId}`);
  }

  async approveMandate(mandateId: string): Promise<Mandate> {
    return await api.post<Mandate>(`/mandates/${mandateId}/approve`);
  }

  async suspendMandate(mandateId: string): Promise<Mandate> {
    return await api.post<Mandate>(`/mandates/${mandateId}/suspend`);
  }

  async revokeMandate(mandateId: string, reason: string): Promise<Mandate> {
    return await api.post<Mandate>(`/mandates/${mandateId}/revoke`, {
      reason,
    });
  }

  async getPurchaseIntents(status?: string): Promise<PurchaseIntent[]> {
    const params: any = {};
    if (status) params.status = status;

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/acp/intents?${queryString}` : '/acp/intents';
    return await api.get<PurchaseIntent[]>(url);
  }

  async approveIntent(intentId: string): Promise<PurchaseIntent> {
    return await api.post<PurchaseIntent>(`/acp/intents/${intentId}/approve`);
  }

  async rejectIntent(intentId: string, reason: string): Promise<PurchaseIntent> {
    return await api.post<PurchaseIntent>(`/acp/intents/${intentId}/reject`, {
      reason,
    });
  }

  async getAgentActions(agentId?: string, limit?: number): Promise<any[]> {
    const params: any = {};
    if (agentId) params.agentId = agentId;
    if (limit) params.limit = limit;

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/acp/actions?${queryString}` : '/acp/actions';
    return await api.get<any[]>(url);
  }
}

export default new MandateService();
