import jwt from 'jsonwebtoken';
import { MandateRepository, AgentMandate } from '../repositories/mandate.repository';
import { AIAgentAppRepository } from '../repositories/ai-agent-app.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { config } from '../config/env';
import { paymentClient } from '../clients/paymentClient';

export interface OverrideDetail {
  limitType: 'merchant_max_transaction' | 'merchant_daily_limit' | 'merchant_monthly_limit';
  merchantLimit: number;
  appMandateLimit: number;
  actualAmount: number;
  exceededBy: number;
}

function buildISOMessageFields(params: {
  networkToken: string;
  amount: number;
  currency: string;
  citTransactionId: string;
  mandateId: string;
}): Record<string, string> {
  const now = new Date();
  const mmddhhmmss = [
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
  ].join('');
  const stan = String(Math.floor(Math.random() * 999999) + 1).padStart(6, '0');
  const masked = params.networkToken.length >= 4
    ? '****' + params.networkToken.slice(-4)
    : '****';

  return {
    MTI: '0200',
    DE2_NetworkToken: masked,
    DE4_Amount: String(Math.round(params.amount * 100)).padStart(12, '0'),
    DE7_TransmissionDateTime: mmddhhmmss,
    DE11_STAN: stan,
    DE25_POSConditionCode: '08',
    DE48_CoFIndicator: 'MIT',
    DE49_Currency: params.currency,
    DE63_OriginalCitRef: params.citTransactionId,
    MandateId: params.mandateId,
  };
}

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
  private transactionRepository: TransactionRepository;
  private merchantRepository: MerchantRepository;

  constructor() {
    this.mandateRepository = new MandateRepository();
    this.agentRepository = new AIAgentAppRepository();
    this.transactionRepository = new TransactionRepository();
    this.merchantRepository = new MerchantRepository();
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
    let tokenExpired = false;
    try {
      decoded = jwt.verify(token, config.jwt.secret as jwt.Secret, {
        issuer: 'mandate-service',
      });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
        if (!decoded || !decoded.mandateId) {
          throw new Error('Invalid consent token.');
        }
        tokenExpired = true;
      } else {
        throw new Error('Invalid consent token.');
      }
    }

    // 2. Load mandate
    const mandate = await this.mandateRepository.getById(decoded.mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }

    // 2b. Auto-renew expired token if mandate is still active
    if (tokenExpired) {
      if (mandate.status !== 'active') {
        throw new Error('Consent token has expired and mandate is no longer active. Please re-approve the mandate.');
      }
      console.log(`[ExecutePayment] Consent token expired for mandate=${mandate.id}, auto-renewing (mandate still active)`);
      const newToken = this.generateConsentToken(mandate);
      await this.mandateRepository.storeConsentToken(mandate.id, newToken);
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

    // Resolve parent APP mandate: use parentMandateId if set, otherwise look up by user+agent
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

    // Resolve merchantId via the agent's registered app
    let merchantId: string | undefined;
    const agentApp = await this.agentRepository.getByAgentId(mandate.agentId);
    if (agentApp?.merchant_id) {
      merchantId = agentApp.merchant_id;
    }

    // ================================================================
    // TIER 1: VRP Consent Limits (checked first — reject if no limits)
    // ================================================================
    const maxPerPayment = Math.max(
      constraints.maxAmountPerPayment || 0,
      constraints.maxTransactionAmount || 0
    );
    const dailyLimit = constraints.dailyLimit ?? mandate.dailyLimit ?? null;
    const monthlyLimit = constraints.monthlyLimit ?? mandate.periodLimit ?? null;

    // Guard: VRP consent MUST have at least one limit configured
    if (!maxPerPayment && dailyLimit == null && monthlyLimit == null) {
      throw new Error(
        'VRP consent has no spending limits configured. ' +
        'Please set at least one limit (per-payment, daily, or monthly) before making payments.'
      );
    }

    // Per-payment limit
    if (maxPerPayment && amount > maxPerPayment) {
      throw new Error(`Amount $${amount.toFixed(2)} exceeds max per payment $${maxPerPayment}`);
    }

    // Reset daily counter if date rolled over
    const today = new Date().toISOString().slice(0, 10);
    if (mandate.lastDailyReset && mandate.lastDailyReset.toString().slice(0, 10) !== today) {
      await this.mandateRepository.resetDailyUsage(mandate.id);
      mandate.amountUsedToday = 0;
      mandate.transactionsToday = 0;
    }

    // Reset monthly counter if month rolled over
    if (mandate.lastMonthlyReset) {
      const now = new Date();
      const lastReset = new Date(mandate.lastMonthlyReset);
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await this.mandateRepository.resetMonthlyUsage(mandate.id);
        mandate.amountUsedPeriod = 0;
      }
    }

    const usedToday = mandate.amountUsedToday || 0;
    const usedMonth = mandate.amountUsedPeriod || 0;

    // Daily limit
    if (dailyLimit != null && usedToday + amount > dailyLimit) {
      throw new Error(`Daily limit exceeded. Used: $${usedToday.toFixed(2)}, Requested: $${amount.toFixed(2)}, Limit: $${dailyLimit}`);
    }

    // Monthly limit
    if (monthlyLimit != null && usedMonth + amount > monthlyLimit) {
      throw new Error(`Monthly limit exceeded. Used: $${usedMonth.toFixed(2)}, Requested: $${amount.toFixed(2)}, Limit: $${monthlyLimit}`);
    }

    console.log(`[ExecutePayment] TIER 1 passed: mandate=${mandate.id} amount=$${amount} maxPerPayment=$${maxPerPayment} dailyLimit=$${dailyLimit} monthlyLimit=$${monthlyLimit}`);

    // ================================================================
    // TIER 2: APP/User Mandate Limits
    // ================================================================
    const pc = parent?.constraints || {};
    const appMaxTxn = pc.maxTransactionAmount ?? null;
    const appDailyLimit = pc.dailySpendingLimit ?? pc.dailyLimit ?? parent?.dailyLimit ?? null;
    const appMonthlyLimit = pc.monthlySpendingLimit ?? pc.monthlyLimit ?? parent?.periodLimit ?? null;

    if (parent) {
      if (parent.status !== 'active') {
        throw new Error(`Parent app mandate is ${parent.status}. Child mandates are invalid when parent is not active.`);
      }

      // APP per-transaction limit
      if (appMaxTxn != null && amount > appMaxTxn) {
        throw new Error(`Transaction amount $${amount.toFixed(2)} exceeds parent app mandate per-transaction limit of $${appMaxTxn}`);
      }

      // APP daily spending limit
      if (appDailyLimit != null && usedToday + amount > appDailyLimit) {
        throw new Error(
          `Transaction would exceed parent app mandate daily spending limit of $${appDailyLimit} (used today: $${usedToday.toFixed(2)})`
        );
      }

      // APP monthly spending limit
      if (appMonthlyLimit != null && usedMonth + amount > appMonthlyLimit) {
        throw new Error(
          `Transaction would exceed parent app mandate monthly spending limit of $${appMonthlyLimit} (used this month: $${usedMonth.toFixed(2)})`
        );
      }

      console.log(`[ExecutePayment] TIER 2 passed: parentId=${parent.id} appMaxTxn=$${appMaxTxn} appDailyLimit=$${appDailyLimit} appMonthlyLimit=$${appMonthlyLimit}`);
    }

    // ================================================================
    // TIER 3: Merchant Default Limits (with override logic)
    // ================================================================
    const overrideDetails: OverrideDetail[] = [];
    let merchant = null;

    if (merchantId) {
      try {
        merchant = await this.merchantRepository.getById(merchantId);
      } catch (err) {
        console.warn(`[ExecutePayment] Failed to load merchant ${merchantId}:`, err);
      }
    }

    if (merchant) {
      const merchMeta = merchant.metadata || {};
      const merchMaxTxn = merchMeta.maxTransactionAmount ?? null;
      const merchDailyLimit = merchMeta.dailyTransactionLimit ?? null;
      const merchMonthlyLimit = merchMeta.monthlyTransactionLimit ?? null;

      // Merchant per-transaction limit
      if (merchMaxTxn != null && amount > merchMaxTxn) {
        if (appMaxTxn != null && appMaxTxn > merchMaxTxn) {
          // APP limit is higher → override allowed
          overrideDetails.push({
            limitType: 'merchant_max_transaction',
            merchantLimit: merchMaxTxn,
            appMandateLimit: appMaxTxn,
            actualAmount: amount,
            exceededBy: amount - merchMaxTxn,
          });
          console.log(`[ExecutePayment] TIER 3 OVERRIDE: merchant maxTxn $${merchMaxTxn} exceeded, but APP limit $${appMaxTxn} allows it`);
        } else {
          throw new Error(
            `Amount $${amount.toFixed(2)} exceeds merchant default per-transaction limit of $${merchMaxTxn}. Contact merchant admin to increase limits.`
          );
        }
      }

      // Merchant daily limit
      if (merchDailyLimit != null && usedToday + amount > merchDailyLimit) {
        if (appDailyLimit != null && appDailyLimit > merchDailyLimit) {
          overrideDetails.push({
            limitType: 'merchant_daily_limit',
            merchantLimit: merchDailyLimit,
            appMandateLimit: appDailyLimit,
            actualAmount: usedToday + amount,
            exceededBy: (usedToday + amount) - merchDailyLimit,
          });
          console.log(`[ExecutePayment] TIER 3 OVERRIDE: merchant dailyLimit $${merchDailyLimit} exceeded, but APP limit $${appDailyLimit} allows it`);
        } else {
          throw new Error(
            `Amount would exceed merchant default daily limit of $${merchDailyLimit} (used today: $${usedToday.toFixed(2)}). Contact merchant admin to increase limits.`
          );
        }
      }

      // Merchant monthly limit
      if (merchMonthlyLimit != null && usedMonth + amount > merchMonthlyLimit) {
        if (appMonthlyLimit != null && appMonthlyLimit > merchMonthlyLimit) {
          overrideDetails.push({
            limitType: 'merchant_monthly_limit',
            merchantLimit: merchMonthlyLimit,
            appMandateLimit: appMonthlyLimit,
            actualAmount: usedMonth + amount,
            exceededBy: (usedMonth + amount) - merchMonthlyLimit,
          });
          console.log(`[ExecutePayment] TIER 3 OVERRIDE: merchant monthlyLimit $${merchMonthlyLimit} exceeded, but APP limit $${appMonthlyLimit} allows it`);
        } else {
          throw new Error(
            `Amount would exceed merchant default monthly limit of $${merchMonthlyLimit} (used this month: $${usedMonth.toFixed(2)}). Contact merchant admin to increase limits.`
          );
        }
      }

      if (overrideDetails.length > 0) {
        console.log(`[ExecutePayment] TIER 3: ${overrideDetails.length} merchant limit override(s) applied`);
      } else {
        console.log(`[ExecutePayment] TIER 3 passed: merchant limits OK`);
      }
    }

    const isExceptional = overrideDetails.length > 0;

    // ================================================================
    // Authorize via Payment Gateway MIT
    // ================================================================
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

    // Update usage counters
    await this.mandateRepository.updateCheckoutUsage(mandate.id, amount);

    // Record transaction with ISO 8583 display fields
    const isoMessage = buildISOMessageFields({
      networkToken: mandate.networkToken,
      amount,
      currency,
      citTransactionId: mandate.citTransactionId,
      mandateId: mandate.id,
    });

    try {
      await this.transactionRepository.create({
        mandateId: mandate.id,
        userId: mandate.userId,
        agentId: mandate.agentId,
        merchantId,
        type: 'payment',
        status: 'completed',
        amount,
        currency,
        gatewayTransactionId: mitResult.transactionId,
        isExceptional,
        gatewayResponse: {
          responseCode: mitResult.responseCode,
          message: mitResult.message,
          isoMessage,
        },
        metadata: {
          parentMandateId: mandate.parentMandateId || parent?.id || null,
          parentAgentName: parent?.agentName || null,
          parentConstraints: parent?.constraints || null,
          citTransactionId: mandate.citTransactionId || null,
          networkToken: mandate.networkToken || null,
          paymentMethods: mandate.paymentMethods || [],
          description: description || null,
          isoMessage,
          // Exceptional transaction details
          ...(isExceptional ? {
            isExceptional: true,
            overrideDetails,
            limitContext: {
              vrpLimits: { maxPerPayment, dailyLimit, monthlyLimit },
              appMandateLimits: parent ? { maxTransactionAmount: appMaxTxn, dailySpendingLimit: appDailyLimit, monthlySpendingLimit: appMonthlyLimit } : null,
              merchantLimits: merchant ? {
                maxTransactionAmount: merchant.metadata?.maxTransactionAmount ?? null,
                dailyTransactionLimit: merchant.metadata?.dailyTransactionLimit ?? null,
                monthlyTransactionLimit: merchant.metadata?.monthlyTransactionLimit ?? null,
              } : null,
            },
          } : {}),
        },
        processedAt: new Date(),
      });
    } catch (err) {
      // Log but don't fail the payment if transaction recording fails
      console.error('[ExecutePayment] Failed to record transaction:', err);
    }

    return {
      transactionId: mitResult.transactionId,
      amount,
      currency,
      mandateId: mandate.id,
      responseCode: mitResult.responseCode,
      message: mitResult.message,
      ...(isExceptional ? { isExceptional: true, overrideDetails } : {}),
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
