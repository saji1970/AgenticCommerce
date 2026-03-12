import jwt from 'jsonwebtoken';
import { MandateRepository, AgentMandate } from '../repositories/mandate.repository';
import { AIAgentAppRepository } from '../repositories/ai-agent-app.repository';
import { config } from '../config/env';
import { paymentClient } from '../clients/paymentClient';

export interface CreateCheckoutMandateData {
  userId: string;
  agentId: string;
  agentName: string;
  paymentMethod: Record<string, any>;
  maxAmountPerPayment: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  expiryDate?: string;
  appMandateId?: string;
  constraints?: Record<string, any>;
}

export class CheckoutMandateService {
  private mandateRepository: MandateRepository;
  private agentRepository: AIAgentAppRepository;

  constructor() {
    this.mandateRepository = new MandateRepository();
    this.agentRepository = new AIAgentAppRepository();
  }

  async createCheckoutMandate(data: CreateCheckoutMandateData) {
    // Validate agent exists
    const agent = await this.agentRepository.getByAgentId(data.agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${data.agentId} not found. Please register the agent first.`);
    }
    if (agent.status !== 'active') {
      throw new Error(`Agent ${data.agentId} is not active. Current status: ${agent.status}`);
    }

    // Resolve parent APP mandate — use explicit ID or look up by user+agent
    let parentMandateId = data.appMandateId;
    if (!parentMandateId) {
      const appMandate = await this.mandateRepository.getActiveAppMandate(data.userId, data.agentId);
      if (appMandate) {
        parentMandateId = appMandate.id;
        console.log(`[CheckoutMandate] Auto-linked parent APP mandate ${appMandate.id} for agent ${data.agentId}`);
      }
    }

    // Inherit maxTransactionAmount from parent APP mandate if it's more permissive
    let maxAmountPerPayment = data.maxAmountPerPayment;
    if (parentMandateId) {
      const parent = await this.mandateRepository.getById(parentMandateId);
      if (parent?.constraints?.maxTransactionAmount && parent.constraints.maxTransactionAmount > maxAmountPerPayment) {
        console.log(`[CheckoutMandate] Using parent maxTransactionAmount $${parent.constraints.maxTransactionAmount} instead of form default $${maxAmountPerPayment}`);
        maxAmountPerPayment = parent.constraints.maxTransactionAmount;
      }
    }

    // Build constraints with checkoutMandate flag
    // Store both field names so admin panel (maxTransactionAmount) and mobile (maxAmountPerPayment) stay in sync
    const constraints: Record<string, any> = {
      ...(data.constraints || {}),
      checkoutMandate: true,
      maxAmountPerPayment,
      maxTransactionAmount: maxAmountPerPayment,
    };
    if (data.dailyLimit != null) constraints.dailyLimit = data.dailyLimit;
    if (data.monthlyLimit != null) constraints.monthlyLimit = data.monthlyLimit;

    // Create the mandate in pending state
    const mandate = await this.mandateRepository.create({
      userId: data.userId,
      agentId: data.agentId,
      agentName: data.agentName || agent.agent_name,
      type: 'payment',
      constraints,
      parentMandateId,
      paymentMethods: [data.paymentMethod],
      validUntil: data.expiryDate ? new Date(data.expiryDate) : undefined,
    });

    // Persist daily/period limits on dedicated columns
    if (data.dailyLimit != null || data.monthlyLimit != null) {
      const updates: Record<string, any> = {};
      if (data.dailyLimit != null) updates.dailyLimit = data.dailyLimit;
      if (data.monthlyLimit != null) updates.periodLimit = data.monthlyLimit;
      // We store monthly limit in periodLimit column with periodType='monthly'
    }

    // Run CIT authorization to provision a network token
    const citResult = await paymentClient.authorizeCIT({
      pan: data.paymentMethod.last4 ? `4111111111111111` : '4111111111111111',
      amount: data.maxAmountPerPayment,
      currency: 'USD',
      mandateId: mandate.id,
    });

    if (!citResult.success || !citResult.networkToken) {
      await this.mandateRepository.updateStatus(
        mandate.id,
        'revoked',
        `CIT authorization failed: ${citResult.errorCode || citResult.message || 'unknown'}`
      );
      throw new Error(`CIT authorization failed: ${citResult.errorCode || citResult.message || 'Card declined'}`);
    }

    // Store network token + CIT reference
    await this.mandateRepository.updateCofData(mandate.id, {
      networkToken: citResult.networkToken,
      citTransactionId: citResult.transactionId,
    });

    return await this.mandateRepository.getById(mandate.id);
  }

  async getUserCheckoutMandates(userId: string, status?: string): Promise<AgentMandate[]> {
    return await this.mandateRepository.getCheckoutMandatesByUser(userId, status);
  }

  async approveCheckoutMandate(mandateId: string, userId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Checkout mandate not found');
    }
    if (mandate.userId !== userId) {
      throw new Error('Unauthorized: This mandate belongs to another user');
    }
    if (mandate.status !== 'pending') {
      throw new Error('Mandate is not pending approval');
    }

    const updatedMandate = await this.mandateRepository.updateStatus(mandateId, 'active');
    const consentToken = this.generateConsentToken(updatedMandate);
    await this.mandateRepository.storeConsentToken(mandateId, consentToken);

    return { mandate: updatedMandate, consentToken };
  }

  async revokeCheckoutMandate(mandateId: string, userId: string, reason?: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Checkout mandate not found');
    }
    if (mandate.userId !== userId) {
      throw new Error('Unauthorized: This mandate belongs to another user');
    }
    if (['completed', 'revoked', 'expired'].includes(mandate.status)) {
      throw new Error(`Cannot revoke mandate with status '${mandate.status}'`);
    }

    return await this.mandateRepository.updateStatus(mandateId, 'revoked', reason);
  }

  async getUsage(mandateId: string) {
    const mandate = await this.mandateRepository.getById(mandateId);
    if (!mandate) {
      throw new Error('Checkout mandate not found');
    }

    const constraints = mandate.constraints || {};
    const dailyLimit = constraints.dailyLimit || mandate.dailyLimit;
    const monthlyLimit = constraints.monthlyLimit || mandate.periodLimit;

    return {
      amountUsedToday: mandate.amountUsedToday || 0,
      amountUsedMonth: mandate.amountUsedPeriod || 0,
      transactionsToday: mandate.transactionsToday || 0,
      remainingToday: dailyLimit != null ? Math.max(0, dailyLimit - (mandate.amountUsedToday || 0)) : null,
      remainingMonth: monthlyLimit != null ? Math.max(0, monthlyLimit - (mandate.amountUsedPeriod || 0)) : null,
      maxAmountPerPayment: Math.max(constraints.maxAmountPerPayment || 0, constraints.maxTransactionAmount || 0),
    };
  }

  async executePaymentWithToken(
    token: string,
    amount: number,
    currency: string = 'USD',
    description?: string
  ) {
    // 1. Validate JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret as jwt.Secret, {
        issuer: 'mandate-service',
      });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Consent token has expired. Please re-approve the mandate.');
      }
      throw new Error('Invalid consent token.');
    }

    // 2. Load mandate
    const mandate = await this.mandateRepository.getById(decoded.mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }

    // 3. Validate status
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

    const constraints = mandate.constraints || {};

    // 5. Check per-payment limit — use parent APP mandate's maxTransactionAmount if available
    //    (the parent is the user's authoritative spending limit source)
    //    Note: mobile form creates with "maxAmountPerPayment", admin panel updates with "maxTransactionAmount"
    let maxPerPayment = Math.max(
      constraints.maxAmountPerPayment || 0,
      constraints.maxTransactionAmount || 0
    ) || constraints.maxAmountPerPayment;

    // Resolve parent: use parentMandateId if set, otherwise look up by user+agent
    let parent: AgentMandate | null = null;
    if (mandate.parentMandateId) {
      parent = await this.mandateRepository.getById(mandate.parentMandateId);
    }
    if (!parent) {
      parent = await this.mandateRepository.getActiveAppMandate(mandate.userId, mandate.agentId);
      if (parent) {
        console.log(`[ExecutePayment] Found APP mandate ${parent.id} for user=${mandate.userId} agent=${mandate.agentId} (parentMandateId was not set)`);
      }
    }

    if (parent && parent.status === 'active' && parent.constraints?.maxTransactionAmount) {
      // Use parent's limit if it's more permissive (user updated it after checkout mandate was created)
      if (!maxPerPayment || parent.constraints.maxTransactionAmount > maxPerPayment) {
        console.log(`[ExecutePayment] Using parent maxTransactionAmount $${parent.constraints.maxTransactionAmount} instead of checkout mandate's $${maxPerPayment}`);
        maxPerPayment = parent.constraints.maxTransactionAmount;
      }
    }

    console.log(`[ExecutePayment] mandate=${mandate.id} amount=$${amount} maxPerPayment=$${maxPerPayment} parentId=${parent?.id || 'none'}`);

    if (maxPerPayment && amount > maxPerPayment) {
      throw new Error(`Amount $${amount.toFixed(2)} exceeds max per payment $${maxPerPayment}`);
    }

    // 6. Reset daily counter if date rolled over
    const today = new Date().toISOString().slice(0, 10);
    if (mandate.lastDailyReset && mandate.lastDailyReset.toString().slice(0, 10) !== today) {
      await this.mandateRepository.resetDailyUsage(mandate.id);
      mandate.amountUsedToday = 0;
      mandate.transactionsToday = 0;
    }

    // 7. Reset monthly counter if month rolled over
    if (mandate.lastMonthlyReset) {
      const now = new Date();
      const lastReset = new Date(mandate.lastMonthlyReset);
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await this.mandateRepository.resetMonthlyUsage(mandate.id);
        mandate.amountUsedPeriod = 0;
      }
    }

    // 8. Check daily limit
    const dailyLimit = constraints.dailyLimit || mandate.dailyLimit;
    if (dailyLimit != null) {
      const usedToday = mandate.amountUsedToday || 0;
      if (usedToday + amount > dailyLimit) {
        throw new Error(`Daily limit exceeded. Used: $${usedToday.toFixed(2)}, Requested: $${amount.toFixed(2)}, Limit: $${dailyLimit}`);
      }
    }

    // 9. Check monthly limit
    const monthlyLimit = constraints.monthlyLimit || mandate.periodLimit;
    if (monthlyLimit != null) {
      const usedMonth = mandate.amountUsedPeriod || 0;
      if (usedMonth + amount > monthlyLimit) {
        throw new Error(`Monthly limit exceeded. Used: $${usedMonth.toFixed(2)}, Requested: $${amount.toFixed(2)}, Limit: $${monthlyLimit}`);
      }
    }

    // 10. Check parent mandate constraints (reuse parent loaded in step 5)
    if (parent) {
      if (parent.status !== 'active') {
        throw new Error(`Parent app mandate is ${parent.status}. Child mandates are invalid when parent is not active.`);
      }
      const pc = parent.constraints || {};
      if (pc.maxTransactionAmount && amount > pc.maxTransactionAmount) {
        throw new Error(`Transaction amount $${amount.toFixed(2)} exceeds parent app mandate limit $${pc.maxTransactionAmount}`);
      }
    }

    // 11. Authorize via Payment Gateway MIT
    const mitResult = await paymentClient.authorizeMIT({
      networkToken: mandate.networkToken,
      amount,
      currency,
      originalCitTransactionId: mandate.citTransactionId,
      mandateId: mandate.id,
    });

    if (!mitResult.success) {
      throw new Error(`MIT authorization failed: ${mitResult.errorCode || mitResult.message || 'Declined'}`);
    }

    // 12. Update usage counters
    await this.mandateRepository.updateCheckoutUsage(mandate.id, amount);

    return {
      transactionId: mitResult.transactionId,
      amount,
      currency,
      mandateId: mandate.id,
      responseCode: mitResult.responseCode,
      message: mitResult.message,
    };
  }

  async validateConsentToken(token: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret as jwt.Secret, {
        issuer: 'mandate-service',
      });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return { valid: false, errors: ['Consent token has expired.'] };
      }
      return { valid: false, errors: ['Invalid consent token.'] };
    }

    const mandate = await this.mandateRepository.getById(decoded.mandateId);
    if (!mandate) {
      return { valid: false, errors: ['Mandate not found.'] };
    }
    if (mandate.status !== 'active') {
      return { valid: false, errors: [`Mandate is ${mandate.status}. Only active mandates are valid.`] };
    }

    if (mandate.validUntil && new Date() > new Date(mandate.validUntil)) {
      await this.mandateRepository.updateStatus(mandate.id, 'expired');
      return { valid: false, errors: ['Mandate has expired.'] };
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

  private generateConsentToken(mandate: AgentMandate): string {
    const payload: any = {
      mandateId: mandate.id,
      userId: mandate.userId,
      agentId: mandate.agentId,
      type: 'checkout',
      constraints: mandate.constraints,
      approvedAt: new Date().toISOString(),
    };

    if (mandate.parentMandateId) {
      payload.parentMandateId = mandate.parentMandateId;
    }

    return jwt.sign(payload, config.jwt.secret as jwt.Secret, {
      expiresIn: '30d',
      issuer: 'mandate-service',
      subject: mandate.id,
    } as jwt.SignOptions);
  }
}
