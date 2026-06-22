import crypto from 'crypto';
import { query } from '../config/database';

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PasswordResetRepository {
  async create(userId: string, expiryMinutes: number): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt.toISOString()]
    );

    return rawToken;
  }

  async findValidByToken(rawToken: string): Promise<PasswordResetTokenRow | null> {
    const tokenHash = hashToken(rawToken);
    const result = await query(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  async markUsed(tokenId: string): Promise<void> {
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [tokenId]
    );
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
  }
}

export const passwordResetRepository = new PasswordResetRepository();
