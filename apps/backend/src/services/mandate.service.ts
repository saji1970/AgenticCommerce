import { MandateRepository } from '../repositories/mandate.repository';
import { AgentActionRepository } from '../repositories/agent-action.repository';
import {
  Mandate,
  MandateType,
  MandateStatus,
  CreateMandateRequest,
  CartMandateConstraints,
  IntentMandateConstraints,
  PaymentMandateConstraints,
} from '@agentic-commerce/shared-types';

export class MandateService {
  private mandateRepository: MandateRepository;
  private actionRepository: AgentActionRepository;

  constructor() {
    this.mandateRepository = new MandateRepository();
    this.actionRepository = new AgentActionRepository();
  }

  async createMandate(userId: string, request: CreateMandateRequest): Promise<Mandate> {
    // Validate constraints based on type
    this.validateConstraints(request.type, request.constraints);

    const mandate = await this.mandateRepository.create(userId, request);

    // Log the action
    await this.actionRepository.log(
      userId,
      request.agentId,
      mandate.id,
      'create_mandate',
      request.type,
      mandate.id,
      { constraints: request.constraints },
      true
    );

    return mandate;
  }

  async getMandate(mandateId: string): Promise<Mandate | null> {
    return await this.mandateRepository.getById(mandateId);
  }

  async getUserMandates(
    userId: string,
    status?: MandateStatus,
    type?: MandateType
  ): Promise<Mandate[]> {
    return await this.mandateRepository.getUserMandates(userId, status, type);
  }

  async approveMandate(mandateId: string, userId: string): Promise<Mandate> {
    const mandate = await this.mandateRepository.getById(mandateId);

    if (!mandate || mandate.userId !== userId) {
      throw new Error('Mandate not found');
    }

    if (mandate.status !== MandateStatus.PENDING) {
      throw new Error('Mandate is not pending approval');
    }

    const updatedMandate = await this.mandateRepository.updateStatus(
      mandateId,
      MandateStatus.ACTIVE
    );

    await this.actionRepository.log(
      userId,
      mandate.agentId,
      mandateId,
      'approve_mandate',
      mandate.type,
      mandateId,
      {},
      true
    );

    return updatedMandate;
  }

  async suspendMandate(mandateId: string, userId: string): Promise<Mandate> {
    const mandate = await this.mandateRepository.getById(mandateId);

    if (!mandate || mandate.userId !== userId) {
      throw new Error('Mandate not found');
    }

    const updatedMandate = await this.mandateRepository.updateStatus(
      mandateId,
      MandateStatus.SUSPENDED
    );

    await this.actionRepository.log(
      userId,
      mandate.agentId,
      mandateId,
      'suspend_mandate',
      mandate.type,
      mandateId,
      {},
      true
    );

    return updatedMandate;
  }

  async revokeMandate(mandateId: string, userId: string, reason: string): Promise<Mandate> {
    const mandate = await this.mandateRepository.getById(mandateId);

    if (!mandate || mandate.userId !== userId) {
      throw new Error('Mandate not found');
    }

    const updatedMandate = await this.mandateRepository.updateStatus(
      mandateId,
      MandateStatus.REVOKED,
      reason
    );

    await this.actionRepository.log(
      userId,
      mandate.agentId,
      mandateId,
      'revoke_mandate',
      mandate.type,
      mandateId,
      { reason },
      true
    );

    return updatedMandate;
  }

  async validateMandateAccess(
    mandateId: string,
    agentId: string,
    requiredType?: MandateType
  ): Promise<Mandate> {
    const mandate = await this.mandateRepository.getById(mandateId);

    if (!mandate) {
      throw new Error('Mandate not found');
    }

    if (mandate.agentId !== agentId) {
      throw new Error('Agent not authorized for this mandate');
    }

    if (mandate.status !== MandateStatus.ACTIVE) {
      throw new Error(`Mandate is ${mandate.status}`);
    }

    if (mandate.validUntil && new Date() > new Date(mandate.validUntil)) {
      await this.mandateRepository.updateStatus(mandateId, MandateStatus.EXPIRED);
      throw new Error('Mandate has expired');
    }

    if (requiredType && mandate.type !== requiredType) {
      throw new Error(`Mandate type mismatch: expected ${requiredType}, got ${mandate.type}`);
    }

    return mandate;
  }

  async validateCartConstraints(
    mandate: Mandate,
    productPrice: number,
    productCategory?: string
  ): Promise<void> {
    const constraints = mandate.constraints as CartMandateConstraints;

    if (constraints.maxItemValue && productPrice > constraints.maxItemValue) {
      throw new Error(`Item price ${productPrice} exceeds max allowed ${constraints.maxItemValue}`);
    }

    if (productCategory) {
      if (constraints.blockedCategories?.includes(productCategory)) {
        throw new Error(`Category ${productCategory} is blocked`);
      }

      if (constraints.allowedCategories && !constraints.allowedCategories.includes(productCategory)) {
        throw new Error(`Category ${productCategory} is not in allowed list`);
      }
    }

    // Check daily limits
    const stats = await this.actionRepository.getMandateStats(mandate.id);
    if (constraints.maxItemsPerDay && stats.total_actions >= constraints.maxItemsPerDay) {
      throw new Error(`Daily limit of ${constraints.maxItemsPerDay} items reached`);
    }
  }

  async validateIntentConstraints(
    mandate: Mandate,
    intentValue: number
  ): Promise<boolean> {
    const constraints = mandate.constraints as IntentMandateConstraints;

    if (constraints.maxIntentValue && intentValue > constraints.maxIntentValue) {
      throw new Error(`Intent value ${intentValue} exceeds max allowed ${constraints.maxIntentValue}`);
    }

    // Check daily limits
    const stats = await this.actionRepository.getMandateStats(mandate.id);
    if (constraints.maxIntentsPerDay && stats.total_actions >= constraints.maxIntentsPerDay) {
      throw new Error(`Daily limit of ${constraints.maxIntentsPerDay} intents reached`);
    }

    // Return true if auto-approval is allowed
    if (constraints.autoApproveUnder && intentValue < constraints.autoApproveUnder) {
      return true;
    }

    return false;
  }

  async validatePaymentConstraints(
    mandate: Mandate,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    const constraints = mandate.constraints as PaymentMandateConstraints;

    if (constraints.maxTransactionAmount && amount > constraints.maxTransactionAmount) {
      throw new Error(`Transaction amount ${amount} exceeds max allowed ${constraints.maxTransactionAmount}`);
    }

    if (constraints.allowedPaymentMethods && !constraints.allowedPaymentMethods.includes(paymentMethod)) {
      throw new Error(`Payment method ${paymentMethod} is not allowed`);
    }

    // Check daily and monthly spending limits
    const today = new Date();
    const todayStats = await this.actionRepository.getMandateStats(mandate.id, today);

    // You would need to implement monthly stats tracking as well
    // For now, we'll just check daily

    if (constraints.dailySpendingLimit) {
      // This would need to sum up actual spending from transactions
      // For now, simplified check
      throw new Error('Daily spending limit validation not yet implemented');
    }
  }

  private validateConstraints(type: MandateType, constraints: any): void {
    // Basic validation - ensure required fields exist based on type
    if (type === MandateType.CART) {
      // Cart constraints are optional, just ensure it's an object
      if (typeof constraints !== 'object') {
        throw new Error('Invalid cart constraints');
      }
    } else if (type === MandateType.INTENT) {
      // Intent constraints validation
      if (typeof constraints !== 'object') {
        throw new Error('Invalid intent constraints');
      }
    } else if (type === MandateType.PAYMENT) {
      // Payment constraints should have at least one limit
      const paymentConstraints = constraints as PaymentMandateConstraints;
      if (!paymentConstraints.maxTransactionAmount &&
          !paymentConstraints.dailySpendingLimit &&
          !paymentConstraints.monthlySpendingLimit) {
        throw new Error('Payment mandate must have at least one spending limit');
      }
    }
  }
}
