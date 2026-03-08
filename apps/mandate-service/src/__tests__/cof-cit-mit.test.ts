/**
 * Card-on-File CIT/MIT End-to-End Tests
 *
 * Tests the full orchestration flow:
 *   - createMandateWithCIT: mandate creation → CIT authorization → network token storage
 *   - processAgentPaymentMIT: limit validation → MIT authorization → usage tracking
 *   - Error paths: CIT decline, MIT decline, limit exceeded, expired, unauthorized
 */

import { MandateRepository } from '../repositories/mandate.repository';
import { MandateService } from '../services/mandate.service';
import { paymentClient } from '../clients/paymentClient';

// Mock infrastructure
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../repositories/ai-agent-app.repository', () => ({
  AIAgentAppRepository: jest.fn().mockImplementation(() => ({
    getByAgentId: jest.fn().mockResolvedValue({
      id: 'agent-1',
      agent_id: 'test-agent',
      agent_name: 'Test Agent',
      status: 'active',
      capabilities: ['cart', 'intent', 'payment'],
    }),
  })),
}));

jest.mock('../config/env', () => ({
  config: {
    jwt: { secret: 'test-secret-key-for-jwt-signing' },
    port: 3001,
    paymentGateway: { url: 'http://localhost:3002' },
  },
}));

jest.mock('../clients/paymentClient', () => ({
  paymentClient: {
    authorizeCIT: jest.fn(),
    authorizeMIT: jest.fn(),
  },
}));

// Mock mandate repository
const mockMandateRepo = {
  create: jest.fn(),
  getById: jest.fn(),
  getUserMandates: jest.fn(),
  getByUserAndAgent: jest.fn(),
  updateStatus: jest.fn(),
  update: jest.fn(),
  getActiveAppMandate: jest.fn(),
  getChildMandates: jest.fn(),
  getAllMandates: jest.fn(),
  getAllWithMerchantScope: jest.fn(),
  getByIdWithMerchantCheck: jest.fn(),
  completeChildMandatesByIds: jest.fn(),
  updateCofData: jest.fn(),
  updateCofUsage: jest.fn(),
  resetDailyUsage: jest.fn(),
  resetPeriodUsage: jest.fn(),
};

jest.spyOn(MandateRepository.prototype, 'create').mockImplementation(mockMandateRepo.create);
jest.spyOn(MandateRepository.prototype, 'getById').mockImplementation(mockMandateRepo.getById);
jest.spyOn(MandateRepository.prototype, 'getUserMandates').mockImplementation(mockMandateRepo.getUserMandates);
jest.spyOn(MandateRepository.prototype, 'getByUserAndAgent').mockImplementation(mockMandateRepo.getByUserAndAgent);
jest.spyOn(MandateRepository.prototype, 'updateStatus').mockImplementation(mockMandateRepo.updateStatus);
jest.spyOn(MandateRepository.prototype, 'update').mockImplementation(mockMandateRepo.update);
jest.spyOn(MandateRepository.prototype, 'getActiveAppMandate').mockImplementation(mockMandateRepo.getActiveAppMandate);
jest.spyOn(MandateRepository.prototype, 'getChildMandates').mockImplementation(mockMandateRepo.getChildMandates);
jest.spyOn(MandateRepository.prototype, 'updateCofData').mockImplementation(mockMandateRepo.updateCofData);
jest.spyOn(MandateRepository.prototype, 'updateCofUsage').mockImplementation(mockMandateRepo.updateCofUsage);
jest.spyOn(MandateRepository.prototype, 'resetDailyUsage').mockImplementation(mockMandateRepo.resetDailyUsage);
jest.spyOn(MandateRepository.prototype, 'resetPeriodUsage').mockImplementation(mockMandateRepo.resetPeriodUsage);

const mockAuthorizeCIT = paymentClient.authorizeCIT as jest.Mock;
const mockAuthorizeMIT = paymentClient.authorizeMIT as jest.Mock;

// Helper: build a standard active mandate with CoF data
function buildActiveMandate(overrides: Record<string, any> = {}) {
  return {
    id: 'mandate-cof-1',
    userId: 'user-1',
    agentId: 'test-agent',
    agentName: 'Test Agent',
    type: 'app' as const,
    status: 'active' as const,
    constraints: { maxTransactionAmount: 500 },
    paymentMethods: [],
    validFrom: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    networkToken: 'NTKN_STORED_TOKEN',
    citTransactionId: 'SIM_CIT_001',
    amountUsedToday: 0,
    amountUsedPeriod: 0,
    lastDailyReset: new Date().toISOString().slice(0, 10),
    lastPeriodReset: new Date().toISOString().slice(0, 10),
    ...overrides,
  };
}

describe('Card-on-File CIT/MIT', () => {
  let service: MandateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MandateService();
  });

  // ─── CIT FLOW ───────────────────────────────────────────────────

  describe('createMandateWithCIT', () => {
    it('creates mandate, runs CIT, stores network token', async () => {
      const createdMandate = buildActiveMandate({
        status: 'pending',
        networkToken: undefined,
        citTransactionId: undefined,
      });
      const activatedMandate = { ...createdMandate, status: 'active' };
      const finalMandate = buildActiveMandate();

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(createdMandate);
      mockMandateRepo.updateStatus.mockResolvedValue(activatedMandate);
      mockMandateRepo.updateCofData.mockResolvedValue(finalMandate);
      mockMandateRepo.getById.mockResolvedValue(finalMandate);

      mockAuthorizeCIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_CIT_001',
        networkToken: 'NTKN_STORED_TOKEN',
        responseCode: '00',
        message: 'Approved',
      });

      const result = await service.createMandateWithCIT({
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'app',
        constraints: { maxTransactionAmount: 500 },
        cardDetails: { pan: '4111111111111111', amount: 0.00 },
      });

      expect(result.networkTokenProvisioned).toBe(true);
      expect(result.citTransactionId).toBe('SIM_CIT_001');
      expect(result.mandate).toBeDefined();

      // Verify the CIT was called with the right PAN
      expect(mockAuthorizeCIT).toHaveBeenCalledWith(
        expect.objectContaining({
          pan: '4111111111111111',
          mandateId: 'mandate-cof-1',
        })
      );

      // Verify network token was stored
      expect(mockMandateRepo.updateCofData).toHaveBeenCalledWith('mandate-cof-1', {
        networkToken: 'NTKN_STORED_TOKEN',
        citTransactionId: 'SIM_CIT_001',
      });
    });

    it('revokes mandate when CIT is declined', async () => {
      const createdMandate = buildActiveMandate({ status: 'pending' });

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(createdMandate);
      mockMandateRepo.updateStatus.mockResolvedValue({ ...createdMandate, status: 'active' });

      mockAuthorizeCIT.mockResolvedValue({
        success: false,
        transactionId: 'SIM_DECLINE',
        responseCode: '05',
        errorCode: 'DECLINED',
        message: 'Card declined by issuer',
      });

      await expect(
        service.createMandateWithCIT({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'app',
          cardDetails: { pan: '4111111111111111', amount: 100.01 },
        })
      ).rejects.toThrow('CIT authorization failed: DECLINED');

      // Verify mandate was revoked
      expect(mockMandateRepo.updateStatus).toHaveBeenCalledWith(
        'mandate-cof-1',
        'revoked',
        expect.stringContaining('CIT authorization failed')
      );
    });

    it('revokes mandate when CIT succeeds but no network token returned', async () => {
      const createdMandate = buildActiveMandate({ status: 'pending' });

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(createdMandate);
      mockMandateRepo.updateStatus.mockResolvedValue({ ...createdMandate, status: 'active' });

      mockAuthorizeCIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_NO_TOKEN',
        responseCode: '00',
        // no networkToken!
      });

      await expect(
        service.createMandateWithCIT({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'app',
          cardDetails: { pan: '4111111111111111', amount: 10.00 },
        })
      ).rejects.toThrow('CIT authorization failed');
    });

    it('revokes mandate on network error', async () => {
      const createdMandate = buildActiveMandate({ status: 'pending' });

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(createdMandate);
      mockMandateRepo.updateStatus.mockResolvedValue({ ...createdMandate, status: 'active' });

      mockAuthorizeCIT.mockResolvedValue({
        success: false,
        transactionId: '',
        responseCode: '96',
        errorCode: 'NETWORK_ERROR',
        message: 'Payment gateway unreachable',
      });

      await expect(
        service.createMandateWithCIT({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'app',
          cardDetails: { pan: '4111111111111111', amount: 50.02 },
        })
      ).rejects.toThrow('CIT authorization failed: NETWORK_ERROR');
    });

    it('persists daily and period limits in constraints', async () => {
      const createdMandate = buildActiveMandate({ status: 'pending' });
      const finalMandate = buildActiveMandate({ constraints: { maxTransactionAmount: 500, dailyLimit: 100, periodLimit: 2000, periodType: 'monthly' } });

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(createdMandate);
      mockMandateRepo.updateStatus.mockResolvedValue({ ...createdMandate, status: 'active' });
      mockMandateRepo.updateCofData.mockResolvedValue(finalMandate);
      mockMandateRepo.update.mockResolvedValue(finalMandate);
      mockMandateRepo.getById.mockResolvedValue(finalMandate);

      mockAuthorizeCIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_CIT_LIMITS',
        networkToken: 'NTKN_WITH_LIMITS',
        responseCode: '00',
      });

      const result = await service.createMandateWithCIT({
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'app',
        constraints: { maxTransactionAmount: 500 },
        cardDetails: { pan: '4111111111111111', amount: 0 },
        dailyLimit: 100,
        periodLimit: 2000,
        periodType: 'monthly',
      });

      expect(result.networkTokenProvisioned).toBe(true);

      // Verify constraints were updated
      expect(mockMandateRepo.update).toHaveBeenCalledWith(
        'mandate-cof-1',
        expect.objectContaining({
          constraints: expect.objectContaining({
            dailyLimit: 100,
            periodLimit: 2000,
            periodType: 'monthly',
          }),
        })
      );
    });
  });

  // ─── MIT FLOW ───────────────────────────────────────────────────

  describe('processAgentPaymentMIT', () => {
    it('processes a successful MIT payment', async () => {
      const mandate = buildActiveMandate();
      mockMandateRepo.getById.mockResolvedValue(mandate);
      mockMandateRepo.updateCofUsage.mockResolvedValue({ ...mandate, amountUsedToday: 25 });

      mockAuthorizeMIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_MIT_001',
        responseCode: '00',
        message: 'Approved',
      });

      const result = await service.processAgentPaymentMIT({
        mandateId: 'mandate-cof-1',
        userId: 'user-1',
        agentId: 'test-agent',
        amount: 25.00,
      });

      expect(result.transactionId).toBe('SIM_MIT_001');
      expect(result.amount).toBe(25.00);
      expect(result.currency).toBe('USD');
      expect(result.mandateId).toBe('mandate-cof-1');
      expect(result.responseCode).toBe('00');

      // Verify MIT was called with stored network token
      expect(mockAuthorizeMIT).toHaveBeenCalledWith(
        expect.objectContaining({
          networkToken: 'NTKN_STORED_TOKEN',
          amount: 25.00,
          originalCitTransactionId: 'SIM_CIT_001',
          mandateId: 'mandate-cof-1',
        })
      );

      // Verify usage was updated
      expect(mockMandateRepo.updateCofUsage).toHaveBeenCalledWith('mandate-cof-1', 25.00);
    });

    it('rejects when mandate not found', async () => {
      mockMandateRepo.getById.mockResolvedValue(null);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'nonexistent',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('Mandate not found');
    });

    it('rejects when userId does not match', async () => {
      const mandate = buildActiveMandate();
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'wrong-user',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('Unauthorized: mandate does not belong to this user');
    });

    it('rejects when agentId does not match', async () => {
      const mandate = buildActiveMandate();
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'wrong-agent',
          amount: 10,
        })
      ).rejects.toThrow('Unauthorized: mandate does not belong to this agent');
    });

    it('rejects when mandate is not active', async () => {
      const mandate = buildActiveMandate({ status: 'suspended' });
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('Mandate is suspended');
    });

    it('rejects when no CoF data present', async () => {
      const mandate = buildActiveMandate({ networkToken: undefined, citTransactionId: undefined });
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('Card-on-File data');
    });

    it('rejects and expires when mandate has passed validUntil', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const mandate = buildActiveMandate({ validUntil: yesterday });
      mockMandateRepo.getById.mockResolvedValue(mandate);
      mockMandateRepo.updateStatus.mockResolvedValue({ ...mandate, status: 'expired' });

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('Mandate has expired');

      expect(mockMandateRepo.updateStatus).toHaveBeenCalledWith('mandate-cof-1', 'expired');
    });

    it('rejects when daily limit would be exceeded', async () => {
      const mandate = buildActiveMandate({
        constraints: { maxTransactionAmount: 500, dailyLimit: 100 },
        amountUsedToday: 80,
      });
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 30,
        })
      ).rejects.toThrow('Daily limit exceeded');
    });

    it('rejects when period limit would be exceeded', async () => {
      const mandate = buildActiveMandate({
        constraints: { maxTransactionAmount: 500, periodLimit: 200 },
        amountUsedPeriod: 180,
      });
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 30,
        })
      ).rejects.toThrow('Period limit exceeded');
    });

    it('rejects when amount exceeds maxTransactionAmount', async () => {
      const mandate = buildActiveMandate({
        constraints: { maxTransactionAmount: 100 },
      });
      mockMandateRepo.getById.mockResolvedValue(mandate);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 150,
        })
      ).rejects.toThrow('exceeds max transaction amount');
    });

    it('rejects when parent mandate is not active', async () => {
      const mandate = buildActiveMandate({ parentMandateId: 'parent-1' });
      const parent = buildActiveMandate({ id: 'parent-1', status: 'revoked' });

      mockMandateRepo.getById
        .mockResolvedValueOnce(mandate)   // first call: the mandate
        .mockResolvedValueOnce(parent);   // second call: the parent

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('Parent app mandate is revoked');
    });

    it('rejects when amount exceeds parent maxTransactionAmount', async () => {
      const mandate = buildActiveMandate({
        parentMandateId: 'parent-1',
        constraints: { maxTransactionAmount: 500 },
      });
      const parent = buildActiveMandate({
        id: 'parent-1',
        constraints: { maxTransactionAmount: 50 },
      });

      mockMandateRepo.getById
        .mockResolvedValueOnce(mandate)
        .mockResolvedValueOnce(parent);

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 75,
        })
      ).rejects.toThrow('exceeds parent app mandate limit');
    });

    it('rejects when MIT authorization is declined', async () => {
      const mandate = buildActiveMandate();
      mockMandateRepo.getById.mockResolvedValue(mandate);

      mockAuthorizeMIT.mockResolvedValue({
        success: false,
        transactionId: 'SIM_MIT_FAIL',
        responseCode: '05',
        errorCode: 'DECLINED',
        message: 'Card declined',
      });

      await expect(
        service.processAgentPaymentMIT({
          mandateId: 'mandate-cof-1',
          userId: 'user-1',
          agentId: 'test-agent',
          amount: 10,
        })
      ).rejects.toThrow('MIT authorization failed: DECLINED');

      // Usage should NOT have been updated
      expect(mockMandateRepo.updateCofUsage).not.toHaveBeenCalled();
    });

    it('resets daily usage when date has rolled over', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const mandate = buildActiveMandate({
        amountUsedToday: 90,
        lastDailyReset: yesterday,
        constraints: { maxTransactionAmount: 500, dailyLimit: 100 },
      });

      mockMandateRepo.getById.mockResolvedValue(mandate);
      mockMandateRepo.resetDailyUsage.mockResolvedValue(undefined);
      mockMandateRepo.updateCofUsage.mockResolvedValue({ ...mandate, amountUsedToday: 50 });

      mockAuthorizeMIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_MIT_RESET',
        responseCode: '00',
        message: 'Approved',
      });

      // This should succeed because daily usage is reset (0 + 50 < 100)
      const result = await service.processAgentPaymentMIT({
        mandateId: 'mandate-cof-1',
        userId: 'user-1',
        agentId: 'test-agent',
        amount: 50,
      });

      expect(result.transactionId).toBe('SIM_MIT_RESET');
      expect(mockMandateRepo.resetDailyUsage).toHaveBeenCalledWith('mandate-cof-1');
    });

    it('passes currency through to MIT request', async () => {
      const mandate = buildActiveMandate();
      mockMandateRepo.getById.mockResolvedValue(mandate);
      mockMandateRepo.updateCofUsage.mockResolvedValue(mandate);

      mockAuthorizeMIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_MIT_EUR',
        responseCode: '00',
        message: 'Approved',
      });

      const result = await service.processAgentPaymentMIT({
        mandateId: 'mandate-cof-1',
        userId: 'user-1',
        agentId: 'test-agent',
        amount: 15,
        currency: 'EUR',
      });

      expect(result.currency).toBe('EUR');
      expect(mockAuthorizeMIT).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'EUR' })
      );
    });
  });

  // ─── FULL END-TO-END FLOW ──────────────────────────────────────

  describe('full CIT → MIT flow', () => {
    it('registers with CIT then processes MIT payment', async () => {
      // --- Step 1: Create mandate with CIT ---
      const pendingMandate = buildActiveMandate({ status: 'pending', networkToken: undefined, citTransactionId: undefined });
      const activeMandate = { ...pendingMandate, status: 'active' };
      const cofMandate = buildActiveMandate();

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(pendingMandate);
      // updateStatus is called twice: once to activate, once if CIT fails (shouldn't happen here)
      mockMandateRepo.updateStatus.mockResolvedValue(activeMandate);
      mockMandateRepo.updateCofData.mockResolvedValue(cofMandate);
      mockMandateRepo.getById.mockResolvedValue(cofMandate);

      mockAuthorizeCIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_CIT_E2E',
        networkToken: 'NTKN_E2E_TOKEN',
        responseCode: '00',
      });

      const citResult = await service.createMandateWithCIT({
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'app',
        constraints: { maxTransactionAmount: 500 },
        cardDetails: { pan: '4111111111111111', amount: 0 },
      });

      expect(citResult.networkTokenProvisioned).toBe(true);
      expect(citResult.citTransactionId).toBe('SIM_CIT_E2E');

      // --- Step 2: Process MIT payment against the same mandate ---
      jest.clearAllMocks();

      // Now getById returns the fully provisioned mandate
      const provisionedMandate = buildActiveMandate({
        networkToken: 'NTKN_E2E_TOKEN',
        citTransactionId: 'SIM_CIT_E2E',
        amountUsedToday: 0,
        amountUsedPeriod: 0,
      });
      mockMandateRepo.getById.mockResolvedValue(provisionedMandate);
      mockMandateRepo.updateCofUsage.mockResolvedValue({
        ...provisionedMandate,
        amountUsedToday: 42,
      });

      mockAuthorizeMIT.mockResolvedValue({
        success: true,
        transactionId: 'SIM_MIT_E2E',
        responseCode: '00',
        message: 'Approved',
      });

      const mitResult = await service.processAgentPaymentMIT({
        mandateId: 'mandate-cof-1',
        userId: 'user-1',
        agentId: 'test-agent',
        amount: 42.00,
      });

      expect(mitResult.transactionId).toBe('SIM_MIT_E2E');
      expect(mitResult.amount).toBe(42.00);
      expect(mitResult.responseCode).toBe('00');

      // Verify MIT used the token from the CIT step
      expect(mockAuthorizeMIT).toHaveBeenCalledWith(
        expect.objectContaining({
          networkToken: 'NTKN_E2E_TOKEN',
          originalCitTransactionId: 'SIM_CIT_E2E',
        })
      );
    });
  });
});
