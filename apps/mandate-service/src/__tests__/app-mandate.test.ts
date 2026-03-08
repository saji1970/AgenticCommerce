/**
 * App Mandate Tests
 * Tests: app mandate creation, parent-child validation,
 * constraint enforcement, duplicate prevention.
 */

import { MandateRepository } from '../repositories/mandate.repository';
import { MandateService } from '../services/mandate.service';

// Mock the database and agent repository
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

// Mock the mandate repository methods
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
};

// Replace MandateRepository prototype methods with mocks
jest.spyOn(MandateRepository.prototype, 'create').mockImplementation(mockMandateRepo.create);
jest.spyOn(MandateRepository.prototype, 'getById').mockImplementation(mockMandateRepo.getById);
jest.spyOn(MandateRepository.prototype, 'getUserMandates').mockImplementation(mockMandateRepo.getUserMandates);
jest.spyOn(MandateRepository.prototype, 'getByUserAndAgent').mockImplementation(mockMandateRepo.getByUserAndAgent);
jest.spyOn(MandateRepository.prototype, 'updateStatus').mockImplementation(mockMandateRepo.updateStatus);
jest.spyOn(MandateRepository.prototype, 'update').mockImplementation(mockMandateRepo.update);
jest.spyOn(MandateRepository.prototype, 'getActiveAppMandate').mockImplementation(mockMandateRepo.getActiveAppMandate);
jest.spyOn(MandateRepository.prototype, 'getChildMandates').mockImplementation(mockMandateRepo.getChildMandates);

describe('App Mandate', () => {
  let mandateService: MandateService;

  beforeEach(() => {
    jest.clearAllMocks();
    mandateService = new MandateService();
  });

  describe('createMandate - app type', () => {
    it('creates an app mandate successfully', async () => {
      const appMandate = {
        id: 'app-mandate-1',
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'app' as const,
        status: 'pending' as const,
        constraints: { maxTransactionAmount: 500, dailySpendingLimit: 1000 },
        paymentMethods: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      };

      mockMandateRepo.getActiveAppMandate.mockResolvedValue(null);
      mockMandateRepo.create.mockResolvedValue(appMandate);

      const result = await mandateService.createMandate({
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'app',
        constraints: { maxTransactionAmount: 500, dailySpendingLimit: 1000 },
      });

      expect(result).toEqual(appMandate);
      expect(mockMandateRepo.getActiveAppMandate).toHaveBeenCalledWith('user-1', 'test-agent');
      expect(mockMandateRepo.create).toHaveBeenCalled();
    });

    it('rejects duplicate active app mandate for same user/agent', async () => {
      mockMandateRepo.getActiveAppMandate.mockResolvedValue({
        id: 'existing-app-mandate',
        userId: 'user-1',
        agentId: 'test-agent',
        type: 'app',
        status: 'active',
      });

      await expect(
        mandateService.createMandate({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'app',
          constraints: {},
        })
      ).rejects.toThrow('An active app mandate already exists');
    });
  });

  describe('createMandate - child with parentMandateId', () => {
    it('creates a child cart mandate with valid parent', async () => {
      const parentMandate = {
        id: 'app-mandate-1',
        userId: 'user-1',
        agentId: 'test-agent',
        type: 'app',
        status: 'active',
        constraints: { maxTransactionAmount: 500 },
      };

      const childMandate = {
        id: 'cart-mandate-1',
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'cart' as const,
        status: 'pending' as const,
        parentMandateId: 'app-mandate-1',
        constraints: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      };

      mockMandateRepo.getById.mockResolvedValue(parentMandate);
      mockMandateRepo.create.mockResolvedValue(childMandate);

      const result = await mandateService.createMandate({
        userId: 'user-1',
        agentId: 'test-agent',
        agentName: 'Test Agent',
        type: 'cart',
        parentMandateId: 'app-mandate-1',
        constraints: {},
      });

      expect(result.parentMandateId).toBe('app-mandate-1');
    });

    it('rejects child when parent is not type app', async () => {
      mockMandateRepo.getById.mockResolvedValue({
        id: 'cart-mandate-x',
        type: 'cart',
        status: 'active',
      });

      await expect(
        mandateService.createMandate({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'payment',
          parentMandateId: 'cart-mandate-x',
          constraints: {},
        })
      ).rejects.toThrow("Parent mandate must be of type 'app'");
    });

    it('rejects child when parent is not active', async () => {
      mockMandateRepo.getById.mockResolvedValue({
        id: 'app-mandate-revoked',
        type: 'app',
        status: 'revoked',
      });

      await expect(
        mandateService.createMandate({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'cart',
          parentMandateId: 'app-mandate-revoked',
          constraints: {},
        })
      ).rejects.toThrow('Parent app mandate is revoked');
    });

    it('rejects child when parent not found', async () => {
      mockMandateRepo.getById.mockResolvedValue(null);

      await expect(
        mandateService.createMandate({
          userId: 'user-1',
          agentId: 'test-agent',
          agentName: 'Test Agent',
          type: 'cart',
          parentMandateId: 'nonexistent',
          constraints: {},
        })
      ).rejects.toThrow('Parent mandate nonexistent not found');
    });
  });

  describe('validateMandateForTransaction - parent constraint check', () => {
    it('enforces parent app mandate constraints', async () => {
      const childMandate = {
        id: 'payment-mandate-1',
        userId: 'user-1',
        agentId: 'test-agent',
        type: 'payment',
        status: 'active',
        parentMandateId: 'app-mandate-1',
        constraints: { maxTransactionAmount: 1000 },
      };

      const parentMandate = {
        id: 'app-mandate-1',
        type: 'app',
        status: 'active',
        constraints: { maxTransactionAmount: 200 },
      };

      mockMandateRepo.getByUserAndAgent.mockResolvedValue(childMandate);
      mockMandateRepo.getById.mockResolvedValue(parentMandate);

      await expect(
        mandateService.validateMandateForTransaction('user-1', 'test-agent', 'payment', 300)
      ).rejects.toThrow('exceeds parent app mandate limit $200');
    });

    it('passes when transaction within both parent and child limits', async () => {
      const childMandate = {
        id: 'payment-mandate-1',
        userId: 'user-1',
        agentId: 'test-agent',
        type: 'payment',
        status: 'active',
        parentMandateId: 'app-mandate-1',
        constraints: { maxTransactionAmount: 500 },
      };

      const parentMandate = {
        id: 'app-mandate-1',
        type: 'app',
        status: 'active',
        constraints: { maxTransactionAmount: 1000 },
      };

      mockMandateRepo.getByUserAndAgent.mockResolvedValue(childMandate);
      mockMandateRepo.getById.mockResolvedValue(parentMandate);

      const result = await mandateService.validateMandateForTransaction('user-1', 'test-agent', 'payment', 100);
      expect(result.id).toBe('payment-mandate-1');
    });

    it('fails when parent app mandate is revoked', async () => {
      const childMandate = {
        id: 'payment-mandate-1',
        userId: 'user-1',
        agentId: 'test-agent',
        type: 'payment',
        status: 'active',
        parentMandateId: 'app-mandate-1',
        constraints: {},
      };

      const parentMandate = {
        id: 'app-mandate-1',
        type: 'app',
        status: 'revoked',
        constraints: {},
      };

      mockMandateRepo.getByUserAndAgent.mockResolvedValue(childMandate);
      mockMandateRepo.getById.mockResolvedValue(parentMandate);

      await expect(
        mandateService.validateMandateForTransaction('user-1', 'test-agent', 'payment', 50)
      ).rejects.toThrow('Parent app mandate is revoked');
    });
  });

  describe('getUserAppMandates', () => {
    it('returns only app mandates for user', async () => {
      const appMandates = [
        { id: 'app-1', type: 'app', status: 'active' },
        { id: 'app-2', type: 'app', status: 'revoked' },
      ];

      mockMandateRepo.getUserMandates.mockResolvedValue(appMandates);

      const result = await mandateService.getUserAppMandates('user-1');
      expect(result).toEqual(appMandates);
      expect(mockMandateRepo.getUserMandates).toHaveBeenCalledWith('user-1', undefined, 'app');
    });
  });

  describe('getAppMandateWithChildren', () => {
    it('returns app mandate with child mandates', async () => {
      const appMandate = { id: 'app-1', type: 'app', status: 'active' };
      const children = [
        { id: 'cart-1', type: 'cart', parentMandateId: 'app-1' },
        { id: 'payment-1', type: 'payment', parentMandateId: 'app-1' },
      ];

      mockMandateRepo.getById.mockResolvedValue(appMandate);
      mockMandateRepo.getChildMandates.mockResolvedValue(children);

      const result = await mandateService.getAppMandateWithChildren('app-1');
      expect(result.mandate).toEqual(appMandate);
      expect(result.children).toEqual(children);
      expect(result.children).toHaveLength(2);
    });

    it('throws if mandate is not app type', async () => {
      mockMandateRepo.getById.mockResolvedValue({ id: 'cart-1', type: 'cart' });

      await expect(
        mandateService.getAppMandateWithChildren('cart-1')
      ).rejects.toThrow('Mandate is not of type app');
    });

    it('throws if mandate not found', async () => {
      mockMandateRepo.getById.mockResolvedValue(null);

      await expect(
        mandateService.getAppMandateWithChildren('nonexistent')
      ).rejects.toThrow('App mandate not found');
    });
  });
});
