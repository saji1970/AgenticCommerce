import { AgentRepository, CreateAgentRequest, UpdateAgentRequest } from '../repositories/agent.repository';

export class AgentService {
  private agentRepository: AgentRepository;

  constructor() {
    this.agentRepository = new AgentRepository();
  }

  async createAgent(data: CreateAgentRequest) {
    // Check if slug or agentId already exists
    const existingBySlug = await this.agentRepository.getBySlug(data.slug);
    if (existingBySlug) {
      throw new Error('Agent with this slug already exists');
    }

    const existingByAgentId = await this.agentRepository.getByAgentId(data.agentId);
    if (existingByAgentId) {
      throw new Error('Agent with this agentId already exists');
    }

    return await this.agentRepository.create(data);
  }

  async getAllAgents() {
    return await this.agentRepository.getAll();
  }

  async getActiveAgents() {
    return await this.agentRepository.getActive();
  }

  async getAgent(id: string) {
    const agent = await this.agentRepository.getById(id);
    if (!agent) {
      throw new Error('Agent not found');
    }
    return agent;
  }

  async getAgentBySlug(slug: string) {
    const agent = await this.agentRepository.getBySlug(slug);
    if (!agent) {
      throw new Error('Agent not found');
    }
    return agent;
  }

  async getAgentByAgentId(agentId: string) {
    const agent = await this.agentRepository.getByAgentId(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    return agent;
  }

  async updateAgent(id: string, data: UpdateAgentRequest) {
    const agent = await this.agentRepository.getById(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if updating agentId would conflict
    if (data.agentId && data.agentId !== agent.agentId) {
      const existing = await this.agentRepository.getByAgentId(data.agentId);
      if (existing && existing.id !== id) {
        throw new Error('Agent with this agentId already exists');
      }
    }

    return await this.agentRepository.update(id, data);
  }

  async deleteAgent(id: string) {
    const agent = await this.agentRepository.getById(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    return await this.agentRepository.delete(id);
  }

  async validateAgent(agentId: string): Promise<boolean> {
    const agent = await this.agentRepository.getByAgentId(agentId);
    return agent !== null && agent.status === 'active';
  }
}
