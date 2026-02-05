/**
 * Security Guard Service
 * Enforces security constraints and detects abuse patterns.
 * Handles: replay attacks, expired mandates, amount overruns,
 * frequency violations, unauthorized agent actions.
 *
 * Every violation is rejected AND produces a security audit log entry.
 */

import { nonceGuard } from '../crypto/nonce-guard';
import { signatureService, SignedMessage } from '../crypto/signature-service';
import { auditLogService } from './audit-log.service';
import { query } from '../config/database';

export type ViolationType =
  | 'replay_attack'
  | 'expired_mandate'
  | 'amount_overrun'
  | 'frequency_violation'
  | 'unauthorized_agent'
  | 'invalid_signature'
  | 'expired_signature'
  | 'agent_suspended'
  | 'agent_revoked'
  | 'mandate_type_mismatch';

export interface SecurityCheckResult {
  passed: boolean;
  violation?: ViolationType;
  error?: string;
}

export class SecurityGuardService {
  // ---- Replay Attack Prevention ----

  async checkReplay(nonce: string, actorId: string, mandateId?: string): Promise<SecurityCheckResult> {
    const fresh = await nonceGuard.consumeNonce(nonce, actorId);
    if (!fresh) {
      await auditLogService.logSecurityViolation(
        'agent', actorId,
        'security.replay_attack',
        `Replay attack detected: nonce '${nonce.substring(0, 16)}...' already consumed`,
        mandateId,
        { nonce: nonce.substring(0, 16) },
      );
      return { passed: false, violation: 'replay_attack', error: 'Nonce already used — possible replay attack' };
    }
    return { passed: true };
  }

  // ---- Mandate Expiry Check ----

  checkMandateExpiry(validUntil: Date | null, mandateId: string, actorId: string): SecurityCheckResult {
    if (validUntil && new Date() > validUntil) {
      // Fire and forget — don't await to keep the check fast
      auditLogService.logSecurityViolation(
        'agent', actorId,
        'security.expired_mandate',
        `Agent '${actorId}' attempted to use expired mandate ${mandateId}`,
        mandateId,
        { validUntil: validUntil.toISOString() },
      );
      return { passed: false, violation: 'expired_mandate', error: 'Mandate has expired' };
    }
    return { passed: true };
  }

  // ---- Amount Overrun Check ----

  async checkAmountLimits(
    mandateId: string,
    agentId: string,
    requestedAmount: number,
    mandate: {
      maxAmount?: number;
      dailyLimit?: number;
      monthlyLimit?: number;
      amountUsed: number;
      amountUsedToday: number;
      amountUsedMonth: number;
    },
  ): Promise<SecurityCheckResult> {
    // Per-transaction limit
    if (mandate.maxAmount && requestedAmount > mandate.maxAmount) {
      await auditLogService.logSecurityViolation(
        'agent', agentId,
        'security.amount_overrun',
        `Amount $${requestedAmount} exceeds per-transaction limit of $${mandate.maxAmount} on mandate ${mandateId}`,
        mandateId,
        { requestedAmount, maxAmount: mandate.maxAmount },
      );
      return {
        passed: false,
        violation: 'amount_overrun',
        error: `Amount $${requestedAmount.toFixed(2)} exceeds per-transaction limit of $${mandate.maxAmount.toFixed(2)}`,
      };
    }

    // Daily spending limit
    if (mandate.dailyLimit && (mandate.amountUsedToday + requestedAmount) > mandate.dailyLimit) {
      const remaining = Math.max(0, mandate.dailyLimit - mandate.amountUsedToday);
      await auditLogService.logSecurityViolation(
        'agent', agentId,
        'security.amount_overrun',
        `Daily limit exceeded on mandate ${mandateId}: used $${mandate.amountUsedToday}, requesting $${requestedAmount}, limit $${mandate.dailyLimit}`,
        mandateId,
        { requestedAmount, dailyUsed: mandate.amountUsedToday, dailyLimit: mandate.dailyLimit },
      );
      return {
        passed: false,
        violation: 'amount_overrun',
        error: `Daily spending limit exceeded. Remaining: $${remaining.toFixed(2)}`,
      };
    }

    // Monthly spending limit
    if (mandate.monthlyLimit && (mandate.amountUsedMonth + requestedAmount) > mandate.monthlyLimit) {
      const remaining = Math.max(0, mandate.monthlyLimit - mandate.amountUsedMonth);
      await auditLogService.logSecurityViolation(
        'agent', agentId,
        'security.amount_overrun',
        `Monthly limit exceeded on mandate ${mandateId}: used $${mandate.amountUsedMonth}, requesting $${requestedAmount}, limit $${mandate.monthlyLimit}`,
        mandateId,
        { requestedAmount, monthlyUsed: mandate.amountUsedMonth, monthlyLimit: mandate.monthlyLimit },
      );
      return {
        passed: false,
        violation: 'amount_overrun',
        error: `Monthly spending limit exceeded. Remaining: $${remaining.toFixed(2)}`,
      };
    }

    return { passed: true };
  }

  // ---- Frequency Violation Check ----

  async checkFrequencyLimit(
    mandateId: string,
    agentId: string,
    maxFrequency: number | null,
    transactionsToday: number,
  ): Promise<SecurityCheckResult> {
    if (maxFrequency != null && transactionsToday >= maxFrequency) {
      await auditLogService.logSecurityViolation(
        'agent', agentId,
        'security.frequency_violation',
        `Frequency limit of ${maxFrequency}/day exceeded on mandate ${mandateId}: ${transactionsToday} transactions today`,
        mandateId,
        { maxFrequency, transactionsToday },
      );
      return {
        passed: false,
        violation: 'frequency_violation',
        error: `Daily transaction limit of ${maxFrequency} reached (${transactionsToday} today)`,
      };
    }
    return { passed: true };
  }

  // ---- Agent Authorization Check ----

  async checkAgentAuthorized(
    agentId: string,
    mandateAgentId: string,
    mandateId: string,
    mandateType: string,
    requestedOperation: string,
  ): Promise<SecurityCheckResult> {
    // Agent must match the mandate
    if (agentId !== mandateAgentId) {
      await auditLogService.logSecurityViolation(
        'agent', agentId,
        'security.unauthorized_agent',
        `Agent '${agentId}' attempted to use mandate ${mandateId} owned by agent '${mandateAgentId}'`,
        mandateId,
        { requestingAgent: agentId, mandateAgent: mandateAgentId },
      );
      return {
        passed: false,
        violation: 'unauthorized_agent',
        error: 'Agent is not authorized to use this mandate',
      };
    }

    // Operation type must match mandate type
    if (mandateType !== requestedOperation) {
      await auditLogService.logSecurityViolation(
        'agent', agentId,
        'security.mandate_type_mismatch',
        `Agent '${agentId}' attempted '${requestedOperation}' on ${mandateType} mandate ${mandateId}`,
        mandateId,
        { mandateType, requestedOperation },
      );
      return {
        passed: false,
        violation: 'mandate_type_mismatch',
        error: `Mandate type '${mandateType}' does not support '${requestedOperation}' operations`,
      };
    }

    return { passed: true };
  }

  // ---- Agent Status Check ----

  async checkAgentStatus(agentId: string): Promise<SecurityCheckResult> {
    try {
      const result = await query(
        `SELECT status FROM ai_agent_apps WHERE agent_id = $1`,
        [agentId],
      );

      if (result.rows.length === 0) {
        await auditLogService.logSecurityViolation(
          'agent', agentId,
          'security.unauthorized_agent',
          `Unknown agent '${agentId}' attempted an action`,
        );
        return { passed: false, violation: 'unauthorized_agent', error: 'Agent not found' };
      }

      const status = result.rows[0].status;
      if (status === 'suspended') {
        await auditLogService.logSecurityViolation(
          'agent', agentId,
          'security.agent_suspended',
          `Suspended agent '${agentId}' attempted an action`,
        );
        return { passed: false, violation: 'agent_suspended', error: 'Agent is suspended' };
      }

      if (status === 'revoked') {
        await auditLogService.logSecurityViolation(
          'agent', agentId,
          'security.agent_revoked',
          `Revoked agent '${agentId}' attempted an action`,
        );
        return { passed: false, violation: 'agent_revoked', error: 'Agent has been permanently revoked' };
      }

      if (status !== 'active') {
        return { passed: false, violation: 'unauthorized_agent', error: `Agent status is '${status}'` };
      }

      return { passed: true };
    } catch {
      // Fail closed
      return { passed: false, violation: 'unauthorized_agent', error: 'Failed to verify agent status' };
    }
  }

  // ---- Signature Verification ----

  async checkSignature(
    signedMessage: SignedMessage,
    publicKeyPem: string,
    actorId: string,
    mandateId?: string,
  ): Promise<SecurityCheckResult> {
    const result = signatureService.verify(signedMessage, publicKeyPem);

    if (!result.valid) {
      const violation: ViolationType = result.expiredTimestamp ? 'expired_signature' : 'invalid_signature';
      await auditLogService.logSecurityViolation(
        'agent', actorId,
        `security.${violation}`,
        `Signature verification failed for actor '${actorId}': ${result.error}`,
        mandateId,
        { error: result.error },
      );
      return { passed: false, violation, error: result.error };
    }

    return { passed: true };
  }

  // ---- Combined Pre-Execution Check ----

  /**
   * Run all security checks before allowing a mandate execution.
   * Returns the first failure, or passes if all checks succeed.
   */
  async preExecutionCheck(params: {
    nonce: string;
    agentId: string;
    mandateId: string;
    mandateAgentId: string;
    mandateType: string;
    mandateStatus: string;
    requestedOperation: string;
    requestedAmount?: number;
    validUntil: Date | null;
    maxAmount?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    maxFrequency?: number;
    amountUsed: number;
    amountUsedToday: number;
    amountUsedMonth: number;
    transactionsToday: number;
  }): Promise<SecurityCheckResult> {
    // 1. Replay attack prevention
    const replayCheck = await this.checkReplay(params.nonce, params.agentId, params.mandateId);
    if (!replayCheck.passed) return replayCheck;

    // 2. Agent status
    const agentCheck = await this.checkAgentStatus(params.agentId);
    if (!agentCheck.passed) return agentCheck;

    // 3. Agent authorization
    const authCheck = await this.checkAgentAuthorized(
      params.agentId, params.mandateAgentId, params.mandateId,
      params.mandateType, params.requestedOperation,
    );
    if (!authCheck.passed) return authCheck;

    // 4. Mandate expiry
    const expiryCheck = this.checkMandateExpiry(params.validUntil, params.mandateId, params.agentId);
    if (!expiryCheck.passed) return expiryCheck;

    // 5. Amount limits (only if amount provided)
    if (params.requestedAmount != null) {
      const amountCheck = await this.checkAmountLimits(
        params.mandateId, params.agentId, params.requestedAmount,
        {
          maxAmount: params.maxAmount,
          dailyLimit: params.dailyLimit,
          monthlyLimit: params.monthlyLimit,
          amountUsed: params.amountUsed,
          amountUsedToday: params.amountUsedToday,
          amountUsedMonth: params.amountUsedMonth,
        },
      );
      if (!amountCheck.passed) return amountCheck;
    }

    // 6. Frequency limits
    const freqCheck = await this.checkFrequencyLimit(
      params.mandateId, params.agentId,
      params.maxFrequency ?? null, params.transactionsToday,
    );
    if (!freqCheck.passed) return freqCheck;

    return { passed: true };
  }
}

export const securityGuardService = new SecurityGuardService();
