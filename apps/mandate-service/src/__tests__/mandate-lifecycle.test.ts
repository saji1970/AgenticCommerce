/**
 * Mandate Lifecycle State Machine Tests
 * Tests: valid transitions, invalid transitions, terminal states.
 */

import { mandateLifecycleService, MandateState } from '../services/mandate-lifecycle.service';

describe('MandateLifecycleService', () => {
  describe('validateTransition', () => {
    // ---- Happy Path: Valid Transitions ----

    it('allows draft → awaiting_consent', () => {
      const result = mandateLifecycleService.validateTransition('draft', 'awaiting_consent');
      expect(result.allowed).toBe(true);
    });

    it('allows awaiting_consent → active', () => {
      const result = mandateLifecycleService.validateTransition('awaiting_consent', 'active');
      expect(result.allowed).toBe(true);
    });

    it('allows awaiting_consent → revoked (user rejection)', () => {
      const result = mandateLifecycleService.validateTransition('awaiting_consent', 'revoked');
      expect(result.allowed).toBe(true);
    });

    it('allows active → completed', () => {
      const result = mandateLifecycleService.validateTransition('active', 'completed');
      expect(result.allowed).toBe(true);
    });

    it('allows active → consumed', () => {
      const result = mandateLifecycleService.validateTransition('active', 'consumed');
      expect(result.allowed).toBe(true);
    });

    it('allows active → revoked', () => {
      const result = mandateLifecycleService.validateTransition('active', 'revoked');
      expect(result.allowed).toBe(true);
    });

    it('allows active → expired', () => {
      const result = mandateLifecycleService.validateTransition('active', 'expired');
      expect(result.allowed).toBe(true);
    });

    // ---- Failure Cases: Invalid Transitions ----

    it('rejects draft → active (must go through awaiting_consent)', () => {
      const result = mandateLifecycleService.validateTransition('draft', 'active');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('rejects draft → consumed', () => {
      const result = mandateLifecycleService.validateTransition('draft', 'consumed');
      expect(result.allowed).toBe(false);
    });

    it('rejects active → draft (cannot go backwards)', () => {
      const result = mandateLifecycleService.validateTransition('active', 'draft');
      expect(result.allowed).toBe(false);
    });

    it('rejects active → awaiting_consent (cannot go backwards)', () => {
      const result = mandateLifecycleService.validateTransition('active', 'awaiting_consent');
      expect(result.allowed).toBe(false);
    });

    // ---- Terminal States ----

    it('rejects completed → any state', () => {
      const targets: MandateState[] = ['draft', 'awaiting_consent', 'active', 'consumed', 'revoked', 'expired'];
      for (const target of targets) {
        const result = mandateLifecycleService.validateTransition('completed', target);
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('terminal state');
      }
    });

    it('rejects consumed → any state', () => {
      const targets: MandateState[] = ['draft', 'awaiting_consent', 'active', 'completed', 'revoked', 'expired'];
      for (const target of targets) {
        const result = mandateLifecycleService.validateTransition('consumed', target);
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('terminal state');
      }
    });

    it('rejects revoked → any state', () => {
      const targets: MandateState[] = ['draft', 'awaiting_consent', 'active', 'completed', 'consumed', 'expired'];
      for (const target of targets) {
        const result = mandateLifecycleService.validateTransition('revoked', target);
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('terminal state');
      }
    });

    it('rejects expired → any state', () => {
      const targets: MandateState[] = ['draft', 'awaiting_consent', 'active', 'completed', 'consumed', 'revoked'];
      for (const target of targets) {
        const result = mandateLifecycleService.validateTransition('expired', target);
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('terminal state');
      }
    });

    it('rejects same-state transition', () => {
      const result = mandateLifecycleService.validateTransition('active', 'active');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('already in state');
    });
  });

  describe('isExecutable', () => {
    it('returns true only for active state', () => {
      expect(mandateLifecycleService.isExecutable('active')).toBe(true);
      expect(mandateLifecycleService.isExecutable('draft')).toBe(false);
      expect(mandateLifecycleService.isExecutable('awaiting_consent')).toBe(false);
      expect(mandateLifecycleService.isExecutable('completed')).toBe(false);
      expect(mandateLifecycleService.isExecutable('consumed')).toBe(false);
      expect(mandateLifecycleService.isExecutable('revoked')).toBe(false);
      expect(mandateLifecycleService.isExecutable('expired')).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('identifies terminal states correctly', () => {
      expect(mandateLifecycleService.isTerminal('completed')).toBe(true);
      expect(mandateLifecycleService.isTerminal('consumed')).toBe(true);
      expect(mandateLifecycleService.isTerminal('revoked')).toBe(true);
      expect(mandateLifecycleService.isTerminal('expired')).toBe(true);
      expect(mandateLifecycleService.isTerminal('draft')).toBe(false);
      expect(mandateLifecycleService.isTerminal('awaiting_consent')).toBe(false);
      expect(mandateLifecycleService.isTerminal('active')).toBe(false);
    });
  });

  describe('shouldExpire', () => {
    it('returns true for past dates', () => {
      const past = new Date(Date.now() - 60000);
      expect(mandateLifecycleService.shouldExpire(past)).toBe(true);
    });

    it('returns false for future dates', () => {
      const future = new Date(Date.now() + 60000);
      expect(mandateLifecycleService.shouldExpire(future)).toBe(false);
    });

    it('returns false for null', () => {
      expect(mandateLifecycleService.shouldExpire(null)).toBe(false);
    });
  });
});
