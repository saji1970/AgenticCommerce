import { v4 as uuidv4 } from 'uuid';
import {
  MandateAuditEvent,
  IntentMandate,
  CartMandate,
  SignedMandate,
  MandateType,
} from '@agentic-commerce/shared';

export interface AuditLogStore {
  save(event: MandateAuditEvent): Promise<void>;
  query(filters: Partial<MandateAuditEvent>): Promise<MandateAuditEvent[]>;
}

/**
 * AP2 Mandate Audit Logger
 * Maintains comprehensive audit trail for all mandate operations
 */
export class MandateAuditLogger {
  constructor(private store: AuditLogStore) {}

  /**
   * Log Intent Mandate creation
   */
  async logIntentMandateCreated(
    mandate: SignedMandate<IntentMandate>,
    metadata?: {
      ip_address?: string;
      user_agent?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    const event: MandateAuditEvent = {
      event_id: `event_${uuidv4()}`,
      mandate_id: mandate.mandate.mandate_id,
      mandate_type: 'intent',
      event_type: 'created',
      user_id: mandate.mandate.user_id,
      timestamp: new Date().toISOString(),
      metadata: {
        request: mandate.mandate.request,
        max_price: mandate.mandate.constraints.max_price,
        valid_until: mandate.mandate.constraints.valid_until,
        ...metadata,
      },
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
    };

    await this.store.save(event);
  }

  /**
   * Log Cart Mandate creation
   */
  async logCartMandateCreated(
    mandate: SignedMandate<CartMandate>,
    metadata?: {
      ip_address?: string;
      user_agent?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    const event: MandateAuditEvent = {
      event_id: `event_${uuidv4()}`,
      mandate_id: mandate.mandate.mandate_id,
      mandate_type: 'cart',
      event_type: 'created',
      user_id: mandate.mandate.user_id,
      timestamp: new Date().toISOString(),
      metadata: {
        intent_mandate_id: mandate.mandate.intent_mandate_id,
        total_price: mandate.mandate.total_price,
        merchant: mandate.mandate.merchant.name,
        items_count: mandate.mandate.items.length,
        ...metadata,
      },
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
    };

    await this.store.save(event);
  }

  /**
   * Log mandate verification
   */
  async logMandateVerified(
    mandateId: string,
    mandateType: MandateType,
    userId: string,
    isValid: boolean,
    errors?: string[]
  ): Promise<void> {
    const event: MandateAuditEvent = {
      event_id: `event_${uuidv4()}`,
      mandate_id: mandateId,
      mandate_type: mandateType,
      event_type: 'verified',
      user_id: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        is_valid: isValid,
        errors,
      },
    };

    await this.store.save(event);
  }

  /**
   * Log mandate execution (payment processed)
   */
  async logMandateExecuted(
    mandateId: string,
    mandateType: MandateType,
    userId: string,
    transactionId: string,
    amount: number,
    status: 'success' | 'failed'
  ): Promise<void> {
    const event: MandateAuditEvent = {
      event_id: `event_${uuidv4()}`,
      mandate_id: mandateId,
      mandate_type: mandateType,
      event_type: 'executed',
      user_id: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        transaction_id: transactionId,
        amount,
        status,
      },
    };

    await this.store.save(event);
  }

  /**
   * Log mandate revocation
   */
  async logMandateRevoked(
    mandateId: string,
    mandateType: MandateType,
    userId: string,
    reason?: string
  ): Promise<void> {
    const event: MandateAuditEvent = {
      event_id: `event_${uuidv4()}`,
      mandate_id: mandateId,
      mandate_type: mandateType,
      event_type: 'revoked',
      user_id: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        reason,
      },
    };

    await this.store.save(event);
  }

  /**
   * Log mandate expiration
   */
  async logMandateExpired(
    mandateId: string,
    mandateType: MandateType,
    userId: string
  ): Promise<void> {
    const event: MandateAuditEvent = {
      event_id: `event_${uuidv4()}`,
      mandate_id: mandateId,
      mandate_type: mandateType,
      event_type: 'expired',
      user_id: userId,
      timestamp: new Date().toISOString(),
    };

    await this.store.save(event);
  }

  /**
   * Get audit trail for a specific mandate
   */
  async getMandateAuditTrail(mandateId: string): Promise<MandateAuditEvent[]> {
    return this.store.query({ mandate_id: mandateId });
  }

  /**
   * Get audit trail for a user
   */
  async getUserAuditTrail(userId: string): Promise<MandateAuditEvent[]> {
    return this.store.query({ user_id: userId });
  }
}
