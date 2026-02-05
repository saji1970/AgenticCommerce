/**
 * Nonce Guard
 * Prevents replay attacks by tracking used nonces.
 * Each nonce can only be used once within its validity window.
 */

import { query } from '../config/database';

const DEFAULT_NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class NonceGuard {
  /**
   * Check and consume a nonce. Returns true if nonce is fresh (unused).
   * Returns false if nonce was already used (replay detected).
   * Fail-closed: any DB error returns false.
   */
  async consumeNonce(nonce: string, actorId: string, ttlMs = DEFAULT_NONCE_TTL_MS): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs);

    try {
      // INSERT will fail on duplicate PK (nonce already used)
      await query(
        `INSERT INTO used_nonces (nonce, actor_id, expires_at) VALUES ($1, $2, $3)`,
        [nonce, actorId, expiresAt.toISOString()],
      );
      return true;
    } catch (err: any) {
      if (err.code === '23505') {
        // unique_violation — nonce already consumed
        return false;
      }
      // Any other error: fail closed
      console.error('[NonceGuard] Database error during nonce check:', err.message);
      return false;
    }
  }

  /**
   * Purge expired nonces to keep the table small.
   * Call periodically (e.g., every 5 minutes).
   */
  async purgeExpired(): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM used_nonces WHERE expires_at < NOW()`,
      );
      return result.rowCount ?? 0;
    } catch {
      return 0;
    }
  }
}

export const nonceGuard = new NonceGuard();
