import jwt from 'jsonwebtoken';
import { MandateRepository, AgentMandate, CreateMandateRequest, UpdateMandateRequest } from '../repositories/mandate.repository';
import { AIAgentAppRepository } from '../repositories/ai-agent-app.repository';
import { config } from '../config/env';
import { paymentClient } from '../clients/paymentClient';

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
    // App mandates require at least 'cart' capability
    const capability = data.type === 'app' ? 'cart' :
                      data.type === 'cart' ? 'cart' :
                      data.type === 'intent' ? 'intent' : 'payment';
    if (!agent.capabilities.includes(capability)) {
      throw new Error(`Agent ${data.agentId} does not have '${capability}' capability. Available capabilities: ${agent.capabilities.join(', ')}`);
    }

    // App mandate: check no existing active app mandate for this user/agent
    if (data.type === 'app') {
      const existing = await this.mandateRepository.getActiveAppMandate(data.userId, data.agentId);
      if (existing) {
        throw new Error(`An active app mandate already exists for this user/agent pair (mandate ID: ${existing.id}). Revoke the existing one first.`);
      }
    }

    // For child mandates (cart/intent/payment): validate parentMandateId if provided
    if (data.parentMandateId && data.type !== 'app') {
      const parent = await this.mandateRepository.getById(data.parentMandateId);
      if (!parent) {
        throw new Error(`Parent mandate ${data.parentMandateId} not found.`);
      }
      if (parent.type !== 'app') {
        throw new Error(`Parent mandate must be of type 'app', got '${parent.type}'.`);
      }
      if (parent.status !== 'active') {
        throw new Error(`Parent app mandate is ${parent.status}. Only active app mandates can have children.`);
      }
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

    const updatedMandate = await this.mandateRepository.updateStatus(mandateId, 'active');

    // Generate a signed mandate token for the approved mandate
    const mandateToken = this.generateMandateToken(updatedMandate);

    return { mandate: updatedMandate, mandateToken };
  }

  /**
   * Generate a signed JWT token containing mandate data.
   * This token is returned to the client app on approval and must be
   * sent back during checkout for validation.
   */
  private generateMandateToken(mandate: any): string {
    const payload: any = {
      mandateId: mandate.id,
      userId: mandate.userId,
      agentId: mandate.agentId,
      type: mandate.type,
      constraints: mandate.constraints,
      approvedAt: new Date().toISOString(),
    };

    if (mandate.parentMandateId) {
      payload.parentMandateId = mandate.parentMandateId;
    }

    return jwt.sign(payload, config.jwt.secret as jwt.Secret, {
      expiresIn: '24h', // Token valid for 24 hours from approval
      issuer: 'mandate-service',
      subject: mandate.id,
    } as jwt.SignOptions);
  }

  /**
   * Validate a mandate token against cart data.
   * Verifies the JWT signature, checks the mandate is still active,
   * and validates that the cart total respects mandate constraints.
   */
  async validateMandateToken(token: string, cartData?: { items: any[]; total: number }) {
    // Verify JWT signature and expiration
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret as jwt.Secret, {
        issuer: 'mandate-service',
      });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return { valid: false, errors: ['Mandate token has expired. Please re-approve the mandate.'] };
      }
      return { valid: false, errors: ['Invalid mandate token.'] };
    }

    // Check the mandate is still active in the database
    const mandate = await this.mandateRepository.getById(decoded.mandateId);
    if (!mandate) {
      return { valid: false, errors: ['Mandate not found.'] };
    }
    if (mandate.status !== 'active') {
      return { valid: false, errors: [`Mandate is ${mandate.status}. Only active mandates are valid.`] };
    }

    // Check mandate hasn't expired
    if (mandate.validUntil && new Date() > new Date(mandate.validUntil)) {
      await this.mandateRepository.updateStatus(mandate.id, 'expired');
      return { valid: false, errors: ['Mandate has expired.'] };
    }

    // If mandate has a parent app mandate, verify it's still active
    if (decoded.parentMandateId || mandate.parentMandateId) {
      const parentId = decoded.parentMandateId || mandate.parentMandateId;
      const parentMandate = await this.mandateRepository.getById(parentId);
      if (!parentMandate) {
        return { valid: false, errors: ['Parent app mandate not found.'] };
      }
      if (parentMandate.status !== 'active') {
        return { valid: false, errors: [`Parent app mandate is ${parentMandate.status}. Only active app mandates are valid.`] };
      }
    }

    // Validate cart data against mandate constraints if provided
    const errors: string[] = [];
    if (cartData) {
      const constraints = mandate.constraints || {};

      if (constraints.maxTransactionAmount && cartData.total > constraints.maxTransactionAmount) {
        errors.push(`Cart total $${cartData.total.toFixed(2)} exceeds max transaction amount $${constraints.maxTransactionAmount}.`);
      }

      if (constraints.maxItemValue && cartData.items) {
        for (const item of cartData.items) {
          if (item.price > constraints.maxItemValue) {
            errors.push(`Item "${item.name || item.productName}" price $${item.price} exceeds max item value $${constraints.maxItemValue}.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      mandate: {
        id: mandate.id,
        userId: mandate.userId,
        agentId: mandate.agentId,
        type: mandate.type,
        constraints: mandate.constraints,
      },
    };
  }

  async suspendMandate(mandateId: string, userId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }
    if (mandate.userId !== userId) {
      throw new Error('Unauthorized: This mandate belongs to another user');
    }
    if (mandate.status !== 'active') {
      throw new Error(`Cannot suspend mandate with status '${mandate.status}', must be 'active'`);
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
    if (['completed', 'revoked', 'expired'].includes(mandate.status)) {
      throw new Error(`Cannot revoke mandate with status '${mandate.status}'`);
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

    // Check parent app mandate constraints too (more restrictive limit wins)
    if (mandate.parentMandateId && transactionAmount !== undefined) {
      const parentMandate = await this.mandateRepository.getById(mandate.parentMandateId);
      if (parentMandate) {
        if (parentMandate.status !== 'active') {
          throw new Error(`Parent app mandate is ${parentMandate.status}. Child mandates are invalid when parent is not active.`);
        }
        const parentConstraints = parentMandate.constraints;
        if (parentConstraints.maxTransactionAmount && transactionAmount > parentConstraints.maxTransactionAmount) {
          throw new Error(`Transaction amount $${transactionAmount} exceeds parent app mandate limit $${parentConstraints.maxTransactionAmount}`);
        }
      }
    }

    return mandate;
  }

  async getUserAppMandates(userId: string) {
    return await this.mandateRepository.getUserMandates(userId, undefined, 'app');
  }

  async completeMandatesAfterPayment(mandateIds: string[]) {
    if (!mandateIds || mandateIds.length === 0) {
      return { completed: [] };
    }

    const completed = await this.mandateRepository.completeChildMandatesByIds(mandateIds);
    console.log(`[MandateService] Completed ${completed.length} mandates after payment:`, completed.map(m => m.id));

    return { completed };
  }

  async getAppMandateWithChildren(mandateId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('App mandate not found');
    }
    if (mandate.type !== 'app') {
      throw new Error('Mandate is not of type app');
    }
    const children = await this.mandateRepository.getChildMandates(mandateId);
    return { mandate, children };
  }

  /**
   * Create a mandate and run a CIT authorization to provision a network token.
   * If the CIT fails the mandate is revoked immediately.
   */
  async createMandateWithCIT(data: CreateMandateRequest & {
    cardDetails: { pan: string; amount: number; currency?: string };
    dailyLimit?: number;
    periodLimit?: number;
    periodType?: 'daily' | 'weekly' | 'monthly';
  }) {
    // 1. Create the mandate in pending state
    const mandate = await this.createMandate(data);

    // 2. Approve the mandate so it can be used
    await this.mandateRepository.updateStatus(mandate.id, 'active');

    // 3. Call Payment Gateway CIT
    const citResult = await paymentClient.authorizeCIT({
      pan: data.cardDetails.pan,
      amount: data.cardDetails.amount,
      currency: data.cardDetails.currency,
      mandateId: mandate.id,
    });

    if (!citResult.success || !citResult.networkToken) {
      // CIT failed — revoke the mandate
      await this.mandateRepository.updateStatus(
        mandate.id,
        'revoked',
        `CIT authorization failed: ${citResult.errorCode || citResult.message || 'unknown'}`
      );
      throw new Error(`CIT authorization failed: ${citResult.errorCode || citResult.message || 'Card declined'}`);
    }

    // 4. Store network token + CIT reference
    await this.mandateRepository.updateCofData(mandate.id, {
      networkToken: citResult.networkToken,
      citTransactionId: citResult.transactionId,
    });

    // 5. Persist daily/period limits if provided
    if (data.dailyLimit != null || data.periodLimit != null || data.periodType) {
      const constraints = { ...mandate.constraints };
      if (data.dailyLimit != null) constraints.dailyLimit = data.dailyLimit;
      if (data.periodLimit != null) constraints.periodLimit = data.periodLimit;
      if (data.periodType) constraints.periodType = data.periodType;
      await this.mandateRepository.update(mandate.id, { constraints });
    }

    return {
      mandate: await this.mandateRepository.getById(mandate.id),
      citTransactionId: citResult.transactionId,
      networkTokenProvisioned: true,
    };
  }

  /**
   * Process an agent-initiated MIT payment against a CoF mandate.
   * Validates limits, resets counters if needed, then authorizes via the Payment Gateway.
   */
  async processAgentPaymentMIT(data: {
    mandateId: string;
    userId: string;
    agentId: string;
    amount: number;
    currency?: string;
  }) {
    // 1. Load mandate
    const mandate = await this.mandateRepository.getById(data.mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }

    // 2. Validate ownership
    if (mandate.userId !== data.userId) {
      throw new Error('Unauthorized: mandate does not belong to this user');
    }
    if (mandate.agentId !== data.agentId) {
      throw new Error('Unauthorized: mandate does not belong to this agent');
    }

    // 3. Validate status + CoF data
    if (mandate.status !== 'active') {
      throw new Error(`Mandate is ${mandate.status}. Only active mandates can process payments.`);
    }
    if (!mandate.networkToken || !mandate.citTransactionId) {
      throw new Error('Mandate does not have Card-on-File data. CIT authorization required first.');
    }

    // 4. Check expiry
    if (mandate.validUntil && new Date() > new Date(mandate.validUntil)) {
      await this.mandateRepository.updateStatus(mandate.id, 'expired');
      throw new Error('Mandate has expired');
    }

    // 5. Reset daily counter if date has rolled over
    const today = new Date().toISOString().slice(0, 10);
    if (mandate.lastDailyReset && mandate.lastDailyReset.toString().slice(0, 10) !== today) {
      await this.mandateRepository.resetDailyUsage(mandate.id);
      mandate.amountUsedToday = 0;
    }

    // 6. Reset period counter if period has rolled over
    if (mandate.periodType && mandate.lastPeriodReset) {
      if (this.shouldResetPeriod(mandate.periodType, new Date(mandate.lastPeriodReset))) {
        await this.mandateRepository.resetPeriodUsage(mandate.id);
        mandate.amountUsedPeriod = 0;
      }
    }

    // 7. Validate daily limit
    const constraints = mandate.constraints || {};
    const dailyLimit = constraints.dailyLimit || mandate.dailyLimit;
    if (dailyLimit != null) {
      const usedToday = mandate.amountUsedToday || 0;
      if (usedToday + data.amount > dailyLimit) {
        throw new Error(`Daily limit exceeded. Used: $${usedToday.toFixed(2)}, Requested: $${data.amount.toFixed(2)}, Limit: $${dailyLimit}`);
      }
    }

    // 8. Validate period limit
    const periodLimit = constraints.periodLimit || mandate.periodLimit;
    if (periodLimit != null) {
      const usedPeriod = mandate.amountUsedPeriod || 0;
      if (usedPeriod + data.amount > periodLimit) {
        throw new Error(`Period limit exceeded. Used: $${usedPeriod.toFixed(2)}, Requested: $${data.amount.toFixed(2)}, Limit: $${periodLimit}`);
      }
    }

    // 9. Validate maxTransactionAmount
    if (constraints.maxTransactionAmount && data.amount > constraints.maxTransactionAmount) {
      throw new Error(`Transaction amount $${data.amount.toFixed(2)} exceeds max transaction amount $${constraints.maxTransactionAmount}`);
    }

    // 10. Check parent mandate constraints (cascade — more restrictive wins)
    if (mandate.parentMandateId) {
      const parent = await this.mandateRepository.getById(mandate.parentMandateId);
      if (parent) {
        if (parent.status !== 'active') {
          throw new Error(`Parent app mandate is ${parent.status}. Child mandates are invalid when parent is not active.`);
        }
        const pc = parent.constraints || {};
        if (pc.maxTransactionAmount && data.amount > pc.maxTransactionAmount) {
          throw new Error(`Transaction amount $${data.amount.toFixed(2)} exceeds parent app mandate limit $${pc.maxTransactionAmount}`);
        }
      }
    }

    // 11. Authorize via Payment Gateway MIT
    const mitResult = await paymentClient.authorizeMIT({
      networkToken: mandate.networkToken,
      amount: data.amount,
      currency: data.currency,
      originalCitTransactionId: mandate.citTransactionId,
      mandateId: mandate.id,
    });

    if (!mitResult.success) {
      throw new Error(`MIT authorization failed: ${mitResult.errorCode || mitResult.message || 'Declined'}`);
    }

    // 12. Update usage counters
    await this.mandateRepository.updateCofUsage(mandate.id, data.amount);

    return {
      transactionId: mitResult.transactionId,
      amount: data.amount,
      currency: data.currency || 'USD',
      mandateId: mandate.id,
      responseCode: mitResult.responseCode,
      message: mitResult.message,
    };
  }

  private shouldResetPeriod(periodType: string, lastReset: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - lastReset.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (periodType) {
      case 'daily':
        return diffDays >= 1;
      case 'weekly':
        return diffDays >= 7;
      case 'monthly':
        // Reset if we are in a different month
        return now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
      default:
        return false;
    }
  }
}
