/**
 * Mandate Hasher
 * Produces a canonical, deterministic SHA-256 hash of a mandate's content.
 * This hash is what the user signs, binding them to exact terms.
 */

import crypto from 'crypto';

export interface MandateHashInput {
  mandateId: string;
  userId: string;
  agentId: string;
  merchantId?: string;
  type: string;
  constraints: Record<string, unknown>;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  maxFrequency?: number;
  validFrom: string;  // ISO-8601
  validUntil?: string;
}

export class MandateHasher {
  /**
   * Compute SHA-256 hash of canonical mandate representation.
   * Canonical form: sorted JSON keys, no whitespace, deterministic.
   */
  computeHash(input: MandateHashInput): string {
    const canonical = this.canonicalize(input);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Verify that a hash matches the mandate content.
   */
  verifyHash(input: MandateHashInput, expectedHash: string): boolean {
    const computed = this.computeHash(input);
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );
  }

  /**
   * Generate human-readable mandate text for display and signing.
   */
  generateMandateText(input: MandateHashInput): string {
    const lines: string[] = [];
    lines.push(`MANDATE AUTHORIZATION`);
    lines.push(`Mandate ID: ${input.mandateId}`);
    lines.push(`Type: ${input.type.toUpperCase()}`);
    lines.push(`Agent: ${input.agentId}`);
    if (input.merchantId) lines.push(`Merchant: ${input.merchantId}`);
    lines.push(`Valid From: ${input.validFrom}`);
    if (input.validUntil) lines.push(`Valid Until: ${input.validUntil}`);
    if (input.maxAmount != null) lines.push(`Max Transaction: $${input.maxAmount.toFixed(2)}`);
    if (input.dailyLimit != null) lines.push(`Daily Limit: $${input.dailyLimit.toFixed(2)}`);
    if (input.monthlyLimit != null) lines.push(`Monthly Limit: $${input.monthlyLimit.toFixed(2)}`);
    if (input.maxFrequency != null) lines.push(`Max Transactions/Day: ${input.maxFrequency}`);
    lines.push(`Constraints: ${JSON.stringify(input.constraints)}`);
    lines.push(`Hash: ${this.computeHash(input)}`);
    return lines.join('\n');
  }

  /**
   * Canonicalize object for hashing: sorted keys, no whitespace.
   */
  private canonicalize(obj: object): string {
    const keys = Object.keys(obj).sort();
    return JSON.stringify(obj, keys);
  }
}

export const mandateHasher = new MandateHasher();
