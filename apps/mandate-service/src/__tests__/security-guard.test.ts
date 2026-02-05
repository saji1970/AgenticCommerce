/**
 * Security Guard Tests
 * Tests: amount overruns, frequency violations, agent authorization, mandate expiry.
 * Note: Tests that require database (replay attacks, agent status) are marked with a DB tag.
 */

import { SecurityGuardService } from '../services/security-guard.service';

// Create a fresh instance that doesn't share state with the singleton
const guard = new SecurityGuardService();

describe('SecurityGuardService', () => {
  describe('checkMandateExpiry', () => {
    it('passes for non-expired mandate', () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const result = guard.checkMandateExpiry(future, 'mandate_1', 'agent_1');
      expect(result.passed).toBe(true);
    });

    it('passes for mandate with no expiry', () => {
      const result = guard.checkMandateExpiry(null, 'mandate_1', 'agent_1');
      expect(result.passed).toBe(true);
    });

    it('fails for expired mandate', () => {
      const past = new Date(Date.now() - 1000);
      const result = guard.checkMandateExpiry(past, 'mandate_1', 'agent_1');
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('expired_mandate');
    });
  });

  describe('checkAmountLimits', () => {
    it('passes when within all limits', async () => {
      const result = await guard.checkAmountLimits('m1', 'a1', 50, {
        maxAmount: 100, dailyLimit: 500, monthlyLimit: 5000,
        amountUsed: 200, amountUsedToday: 100, amountUsedMonth: 200,
      });
      expect(result.passed).toBe(true);
    });

    it('fails when exceeding per-transaction limit', async () => {
      const result = await guard.checkAmountLimits('m1', 'a1', 150, {
        maxAmount: 100, dailyLimit: 500, monthlyLimit: 5000,
        amountUsed: 0, amountUsedToday: 0, amountUsedMonth: 0,
      });
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('amount_overrun');
      expect(result.error).toContain('per-transaction limit');
    });

    it('fails when exceeding daily limit', async () => {
      const result = await guard.checkAmountLimits('m1', 'a1', 50, {
        maxAmount: 100, dailyLimit: 100, monthlyLimit: 5000,
        amountUsed: 200, amountUsedToday: 80, amountUsedMonth: 200,
      });
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('amount_overrun');
      expect(result.error).toContain('Daily spending limit');
    });

    it('fails when exceeding monthly limit', async () => {
      const result = await guard.checkAmountLimits('m1', 'a1', 50, {
        maxAmount: 100, dailyLimit: 500, monthlyLimit: 100,
        amountUsed: 200, amountUsedToday: 0, amountUsedMonth: 80,
      });
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('amount_overrun');
      expect(result.error).toContain('Monthly spending limit');
    });

    it('passes when limits are not set', async () => {
      const result = await guard.checkAmountLimits('m1', 'a1', 99999, {
        maxAmount: undefined, dailyLimit: undefined, monthlyLimit: undefined,
        amountUsed: 0, amountUsedToday: 0, amountUsedMonth: 0,
      });
      expect(result.passed).toBe(true);
    });
  });

  describe('checkFrequencyLimit', () => {
    it('passes when under limit', async () => {
      const result = await guard.checkFrequencyLimit('m1', 'a1', 10, 5);
      expect(result.passed).toBe(true);
    });

    it('fails when at limit', async () => {
      const result = await guard.checkFrequencyLimit('m1', 'a1', 10, 10);
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('frequency_violation');
    });

    it('fails when over limit', async () => {
      const result = await guard.checkFrequencyLimit('m1', 'a1', 10, 15);
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('frequency_violation');
    });

    it('passes when no limit set', async () => {
      const result = await guard.checkFrequencyLimit('m1', 'a1', null, 999);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkAgentAuthorized', () => {
    it('passes when agent matches mandate', async () => {
      const result = await guard.checkAgentAuthorized('agent_1', 'agent_1', 'm1', 'payment', 'payment');
      expect(result.passed).toBe(true);
    });

    it('fails when agent does not match mandate', async () => {
      const result = await guard.checkAgentAuthorized('agent_2', 'agent_1', 'm1', 'payment', 'payment');
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('unauthorized_agent');
    });

    it('fails when operation type does not match mandate type', async () => {
      const result = await guard.checkAgentAuthorized('agent_1', 'agent_1', 'm1', 'cart', 'payment');
      expect(result.passed).toBe(false);
      expect(result.violation).toBe('mandate_type_mismatch');
    });
  });
});
