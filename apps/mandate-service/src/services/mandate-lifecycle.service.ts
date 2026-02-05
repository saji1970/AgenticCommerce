/**
 * Mandate Lifecycle Service
 * Enforces strict state transitions for mandates.
 *
 * State machine:
 *   draft → awaiting_consent → active → consumed | revoked | expired
 *
 * Invalid transitions are rejected and logged as security events.
 */

import { auditLogService } from './audit-log.service';

export type MandateState = 'draft' | 'awaiting_consent' | 'active' | 'consumed' | 'revoked' | 'expired';

/**
 * Valid transitions: key = current state, value = allowed next states.
 */
const VALID_TRANSITIONS: Record<MandateState, MandateState[]> = {
  draft:              ['awaiting_consent'],
  awaiting_consent:   ['active', 'revoked'],  // user can reject (revoke) during consent
  active:             ['consumed', 'revoked', 'expired'],
  consumed:           [],                      // terminal
  revoked:            [],                      // terminal
  expired:            [],                      // terminal
};

/**
 * Terminal states — no further transitions allowed.
 */
const TERMINAL_STATES: Set<MandateState> = new Set(['consumed', 'revoked', 'expired']);

export interface TransitionResult {
  allowed: boolean;
  error?: string;
}

export class MandateLifecycleService {
  /**
   * Validate whether a state transition is allowed.
   * Does NOT perform the transition — just validates.
   */
  validateTransition(currentState: MandateState, targetState: MandateState): TransitionResult {
    if (currentState === targetState) {
      return { allowed: false, error: `Mandate is already in state '${currentState}'` };
    }

    if (TERMINAL_STATES.has(currentState)) {
      return {
        allowed: false,
        error: `Mandate in terminal state '${currentState}' cannot transition to '${targetState}'`,
      };
    }

    const allowed = VALID_TRANSITIONS[currentState];
    if (!allowed || !allowed.includes(targetState)) {
      return {
        allowed: false,
        error: `Invalid transition: '${currentState}' → '${targetState}'. Allowed: [${(allowed || []).join(', ')}]`,
      };
    }

    return { allowed: true };
  }

  /**
   * Attempt a state transition. If invalid, reject and log a security event.
   * Returns true if transition is allowed, false if rejected.
   */
  async attemptTransition(
    mandateId: string,
    currentState: MandateState,
    targetState: MandateState,
    actorType: 'user' | 'agent' | 'merchant' | 'system',
    actorId: string,
  ): Promise<TransitionResult> {
    const result = this.validateTransition(currentState, targetState);

    if (!result.allowed) {
      // Log as a security event — invalid transitions may indicate bugs or attacks
      await auditLogService.logSecurityViolation(
        actorType,
        actorId,
        'mandate.invalid_transition',
        `Rejected transition '${currentState}' → '${targetState}' for mandate ${mandateId}: ${result.error}`,
        mandateId,
        { currentState, targetState },
      );
      return result;
    }

    // Log the valid transition
    await auditLogService.logMandateStateChange(
      actorType,
      actorId,
      mandateId,
      currentState,
      targetState,
      `Mandate ${mandateId} transitioned from '${currentState}' to '${targetState}'`,
    );

    return { allowed: true };
  }

  /**
   * Check if a mandate is in a usable state for execution.
   */
  isExecutable(state: MandateState): boolean {
    return state === 'active';
  }

  /**
   * Check if a mandate is in a terminal state.
   */
  isTerminal(state: MandateState): boolean {
    return TERMINAL_STATES.has(state);
  }

  /**
   * Get the list of valid next states from the current state.
   */
  getValidNextStates(currentState: MandateState): MandateState[] {
    return VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Check if a mandate should be expired based on its validity window.
   */
  shouldExpire(validUntil: Date | null): boolean {
    if (!validUntil) return false;
    return new Date() > validUntil;
  }
}

export const mandateLifecycleService = new MandateLifecycleService();
