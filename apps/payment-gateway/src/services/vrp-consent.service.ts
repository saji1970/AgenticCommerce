import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { vrpConsentRepository, VrpConsent } from '../repositories/vrp-consent.repository';
import { vrpTransactionRepository, VrpTransaction } from '../repositories/vrp-transaction.repository';

export const vrpConsentService = {
  async createConsent(data: {
    userId: string;
    agentId: string;
    agentName: string;
    paymentMethod: Record<string, any>;
    maxAmountPerPayment: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    expiryDate?: string;
    constraints?: Record<string, any>;
  }): Promise<VrpConsent> {
    return vrpConsentRepository.create(data);
  },

  async approveConsent(consentId: string, userId: string): Promise<{ consent: VrpConsent; token: string }> {
    const consent = await vrpConsentRepository.getById(consentId);
    if (!consent) throw new Error('Consent not found');
    if (consent.userId !== userId) throw new Error('Not authorized to approve this consent');
    if (consent.status !== 'pending') throw new Error(`Cannot approve consent with status: ${consent.status}`);

    // Generate JWT token
    const tokenPayload: Record<string, any> = {
      consentId: consent.id,
      userId: consent.userId,
      agentId: consent.agentId,
      maxAmountPerPayment: consent.maxAmountPerPayment,
      dailyLimit: consent.dailyLimit,
      monthlyLimit: consent.monthlyLimit,
    };

    const tokenOptions: jwt.SignOptions = {};
    if (consent.expiryDate) {
      const expiresInMs = new Date(consent.expiryDate).getTime() - Date.now();
      if (expiresInMs > 0) {
        tokenOptions.expiresIn = Math.floor(expiresInMs / 1000);
      }
    } else {
      tokenOptions.expiresIn = '365d';
    }

    const token = jwt.sign(tokenPayload, config.jwtSecret, tokenOptions);

    // Update status and store token
    const updated = await vrpConsentRepository.updateStatus(consentId, 'active');
    await vrpConsentRepository.storeToken(consentId, token);

    return { consent: updated!, token };
  },

  async revokeConsent(consentId: string, userId: string, reason?: string): Promise<VrpConsent> {
    const consent = await vrpConsentRepository.getById(consentId);
    if (!consent) throw new Error('Consent not found');
    if (consent.userId !== userId) throw new Error('Not authorized to revoke this consent');
    if (consent.status === 'revoked') throw new Error('Consent is already revoked');

    const updated = await vrpConsentRepository.updateStatus(consentId, 'revoked', { revokedReason: reason });
    return updated!;
  },

  async validateAndExecutePayment(data: {
    consentId: string;
    agentId: string;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ transaction: VrpTransaction; gatewayResult: any }> {
    const consent = await vrpConsentRepository.getById(data.consentId);
    if (!consent) throw new Error('Consent not found');
    if (consent.agentId !== data.agentId) throw new Error('Agent not authorized for this consent');
    if (consent.status !== 'active') throw new Error(`Consent is not active (status: ${consent.status})`);

    // Check expiry
    if (consent.expiryDate && new Date(consent.expiryDate) < new Date()) {
      await vrpConsentRepository.updateStatus(consent.id, 'expired');
      throw new Error('Consent has expired');
    }

    // Reset daily/monthly counters if date rolled over
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    if (consent.lastDailyReset !== today) {
      await vrpConsentRepository.resetDailyCounters(consent.id);
      consent.amountUsedToday = 0;
      consent.transactionsToday = 0;
    }

    if (consent.lastMonthlyReset && consent.lastMonthlyReset.substring(0, 7) !== currentMonth) {
      await vrpConsentRepository.resetMonthlyCounters(consent.id);
      consent.amountUsedMonth = 0;
    }

    // Check per-payment limit
    if (data.amount > consent.maxAmountPerPayment) {
      throw new Error(`Amount $${data.amount} exceeds max per payment limit of $${consent.maxAmountPerPayment}`);
    }

    // Check daily limit
    if (consent.dailyLimit !== null && (consent.amountUsedToday + data.amount) > consent.dailyLimit) {
      throw new Error(`Amount would exceed daily limit of $${consent.dailyLimit} (used today: $${consent.amountUsedToday})`);
    }

    // Check monthly limit
    if (consent.monthlyLimit !== null && (consent.amountUsedMonth + data.amount) > consent.monthlyLimit) {
      throw new Error(`Amount would exceed monthly limit of $${consent.monthlyLimit} (used this month: $${consent.amountUsedMonth})`);
    }

    // Create transaction record
    const transaction = await vrpTransactionRepository.create({
      consentId: consent.id,
      userId: consent.userId,
      agentId: data.agentId,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      metadata: data.metadata,
    });

    // Process payment (mock gateway - always approves)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    const gatewayTxnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const gatewayResult = {
      success: true,
      transactionId: gatewayTxnId,
      status: 'approved',
      amount: data.amount,
      currency: data.currency || 'USD',
      processedAt: new Date().toISOString(),
      gateway: 'Mock Payment Gateway',
    };

    // Update transaction with gateway result
    const updatedTxn = await vrpTransactionRepository.updateStatus(transaction.id, 'completed', gatewayTxnId);

    // Update usage counters
    await vrpConsentRepository.updateUsage(consent.id, data.amount);

    console.log(`VRP Payment approved: ${gatewayTxnId} for $${data.amount} (consent: ${consent.id})`);

    return { transaction: updatedTxn!, gatewayResult };
  },

  async validateToken(token: string): Promise<{ valid: boolean; consent?: VrpConsent; error?: string }> {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      const consent = await vrpConsentRepository.getById(payload.consentId);

      if (!consent) return { valid: false, error: 'Consent not found' };
      if (consent.status !== 'active') return { valid: false, error: `Consent is ${consent.status}` };
      if (consent.expiryDate && new Date(consent.expiryDate) < new Date()) {
        return { valid: false, error: 'Consent has expired' };
      }

      return { valid: true, consent };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Invalid token' };
    }
  },

  async getUsage(consentId: string): Promise<{
    amountUsedToday: number;
    amountUsedMonth: number;
    transactionsToday: number;
    remainingToday: number | null;
    remainingMonth: number | null;
    maxAmountPerPayment: number;
  }> {
    const consent = await vrpConsentRepository.getById(consentId);
    if (!consent) throw new Error('Consent not found');

    return {
      amountUsedToday: consent.amountUsedToday,
      amountUsedMonth: consent.amountUsedMonth,
      transactionsToday: consent.transactionsToday,
      remainingToday: consent.dailyLimit !== null ? Math.max(0, consent.dailyLimit - consent.amountUsedToday) : null,
      remainingMonth: consent.monthlyLimit !== null ? Math.max(0, consent.monthlyLimit - consent.amountUsedMonth) : null,
      maxAmountPerPayment: consent.maxAmountPerPayment,
    };
  },

  async getConsentById(id: string): Promise<VrpConsent | null> {
    return vrpConsentRepository.getById(id);
  },

  async getUserConsents(userId: string, status?: string): Promise<VrpConsent[]> {
    return vrpConsentRepository.getByUserId(userId, status);
  },

  async getAllConsents(filters?: { status?: string; agentId?: string; limit?: number; offset?: number }): Promise<{ consents: VrpConsent[]; total: number }> {
    return vrpConsentRepository.getAll(filters);
  },

  async getTransactionsByConsent(consentId: string, limit?: number, offset?: number): Promise<{ transactions: VrpTransaction[]; total: number }> {
    return vrpTransactionRepository.getByConsentId(consentId, limit, offset);
  },

  async getAllTransactions(filters?: { status?: string; userId?: string; agentId?: string; limit?: number; offset?: number }): Promise<{ transactions: VrpTransaction[]; total: number }> {
    return vrpTransactionRepository.getAll(filters);
  },

  // Admin actions
  async suspendConsent(consentId: string): Promise<VrpConsent> {
    const consent = await vrpConsentRepository.getById(consentId);
    if (!consent) throw new Error('Consent not found');
    if (consent.status !== 'active') throw new Error('Can only suspend active consents');
    const updated = await vrpConsentRepository.updateStatus(consentId, 'suspended');
    return updated!;
  },

  async adminRevokeConsent(consentId: string, reason?: string): Promise<VrpConsent> {
    const consent = await vrpConsentRepository.getById(consentId);
    if (!consent) throw new Error('Consent not found');
    if (consent.status === 'revoked') throw new Error('Consent is already revoked');
    const updated = await vrpConsentRepository.updateStatus(consentId, 'revoked', { revokedReason: reason || 'Admin revoked' });
    return updated!;
  },
};
