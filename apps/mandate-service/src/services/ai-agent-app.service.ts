import { AIAgentAppRepository, CreateAIAgentAppRequest, UpdateAIAgentAppRequest } from '../repositories/ai-agent-app.repository';

export class AIAgentAppService {
  private agentAppRepository: AIAgentAppRepository;

  constructor() {
    this.agentAppRepository = new AIAgentAppRepository();
  }

  async createAgentApp(data: CreateAIAgentAppRequest) {
    // Check if slug or agent_id already exists
    const existingBySlug = await this.agentAppRepository.getBySlug(data.slug);
    if (existingBySlug) {
      throw new Error('Agent app with this slug already exists');
    }

    const existingByAgentId = await this.agentAppRepository.getByAgentId(data.agent_id);
    if (existingByAgentId) {
      throw new Error('Agent app with this agent_id already exists');
    }

    return await this.agentAppRepository.create(data);
  }

  async getAllAgentApps() {
    return await this.agentAppRepository.getAll();
  }

  async getActiveAgentApps() {
    return await this.agentAppRepository.getActive();
  }

  async getAgentApp(id: string) {
    const app = await this.agentAppRepository.getById(id);
    if (!app) {
      throw new Error('Agent app not found');
    }
    return app;
  }

  async getAgentAppBySlug(slug: string) {
    const app = await this.agentAppRepository.getBySlug(slug);
    if (!app) {
      throw new Error('Agent app not found');
    }
    return app;
  }

  async getAgentAppByAgentId(agentId: string) {
    const app = await this.agentAppRepository.getByAgentId(agentId);
    if (!app) {
      throw new Error('Agent app not found');
    }
    return app;
  }

  async updateAgentApp(id: string, data: UpdateAIAgentAppRequest) {
    const app = await this.agentAppRepository.getById(id);
    if (!app) {
      throw new Error('Agent app not found');
    }

    // Check if updating agent_id would conflict
    if (data.agent_id && data.agent_id !== app.agent_id) {
      const existing = await this.agentAppRepository.getByAgentId(data.agent_id);
      if (existing && existing.id !== id) {
        throw new Error('Agent app with this agent_id already exists');
      }
    }

    return await this.agentAppRepository.update(id, data);
  }

  async deleteAgentApp(id: string) {
    const app = await this.agentAppRepository.getById(id);
    if (!app) {
      throw new Error('Agent app not found');
    }

    return await this.agentAppRepository.delete(id);
  }
}
