import { MandateRepository, CreateMandateRequest, UpdateMandateRequest } from '../repositories/mandate.repository';
import { AIAgentAppRepository } from '../repositories/ai-agent-app.repository';

export class MandateService {
  private mandateRepository: MandateRepository;
  private agentRepository: AIAgentAppRepository;

  constructor() {
    this.mandateRepository = new MandateRepository();
    this.agentRepository = new AIAgentAppRepository();
  }

  async createMandate(data: CreateMandateRequest) {
    // Validate agent exists and is active
    const agent = await this.agentRepository.getByAgentId(data.agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${data.agentId} not found. Please register the agent first.`);
    }
    if (agent.status !== 'active') {
      throw new Error(`Agent ${data.agentId} is not active. Current status: ${agent.status}`);
    }

    // Validate agent has capability for this mandate type
    const capability = data.type === 'cart' ? 'cart' :
                      data.type === 'intent' ? 'intent' : 'payment';
    if (!agent.capabilities.includes(capability)) {
      throw new Error(`Agent ${data.agentId} does not have '${capability}' capability. Available capabilities: ${agent.capabilities.join(', ')}`);
    }

    // Use agent name from database if not provided
    const agentName = data.agentName || agent.agent_name;

    return await this.mandateRepository.create({
      ...data,
      agentName,
    });
  }

  async getMandate(mandateId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }
    return mandate;
  }

  async getUserMandates(userId: string, status?: string, type?: string) {
    return await this.mandateRepository.getUserMandates(userId, status, type);
  }

  async getAllMandates(status?: string, type?: string, limit?: number) {
    return await this.mandateRepository.getAllMandates(status, type, limit);
  }

  async getByUserAndAgent(userId: string, agentId: string, type?: string) {
    return await this.mandateRepository.getByUserAndAgent(userId, agentId, type);
  }

  async approveMandate(mandateId: string, userId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }
    if (mandate.userId !== userId) {
      throw new Error('Unauthorized: This mandate belongs to another user');
    }
    if (mandate.status !== 'pending') {
      throw new Error('Mandate is not pending approval');
    }

    return await this.mandateRepository.updateStatus(mandateId, 'active');
  }

  async suspendMandate(mandateId: string, userId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }
    if (mandate.userId !== userId) {
      throw new Error('Unauthorized: This mandate belongs to another user');
    }

    return await this.mandateRepository.updateStatus(mandateId, 'suspended');
  }

  async revokeMandate(mandateId: string, userId: string, reason?: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }
    if (mandate.userId !== userId) {
      throw new Error('Unauthorized: This mandate belongs to another user');
    }

    return await this.mandateRepository.updateStatus(mandateId, 'revoked', reason);
  }

  async validateMandateForTransaction(
    userId: string,
    agentId: string,
    mandateType: 'cart' | 'intent' | 'payment',
    transactionAmount?: number
  ) {
    const mandate = await this.mandateRepository.getByUserAndAgent(userId, agentId, mandateType);

    if (!mandate) {
      throw new Error(`No ${mandateType} mandate found for agent ${agentId}`);
    }

    if (mandate.status !== 'active') {
      throw new Error(`Mandate is ${mandate.status}. Only active mandates can be used for transactions.`);
    }

    if (mandate.validUntil && new Date() > new Date(mandate.validUntil)) {
      await this.mandateRepository.updateStatus(mandate.id, 'expired');
      throw new Error('Mandate has expired');
    }

    // Validate transaction amount against constraints
    if (transactionAmount !== undefined && mandate.type === 'payment') {
      const constraints = mandate.constraints;
      if (constraints.maxTransactionAmount && transactionAmount > constraints.maxTransactionAmount) {
        throw new Error(`Transaction amount $${transactionAmount} exceeds maximum allowed $${constraints.maxTransactionAmount}`);
      }
    }

    return mandate;
  }
}
