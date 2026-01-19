import { query } from '../config/database';

export interface UserPublicKey {
  id: string;
  userId: string;
  publicKeyPem: string;
  keyAlgorithm: string;
  keyId: string;
  deviceId?: string;
  attestationData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

export interface CreatePublicKeyRequest {
  userId: string;
  publicKeyPem: string;
  keyAlgorithm?: string;
  keyId: string;
  deviceId?: string;
  attestationData?: Record<string, any>;
}

export class PublicKeyRepository {
  async create(data: CreatePublicKeyRequest): Promise<UserPublicKey> {
    const result = await query(
      `INSERT INTO user_public_keys (user_id, public_key_pem, key_algorithm, key_id, device_id, attestation_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.userId,
        data.publicKeyPem,
        data.keyAlgorithm || 'ECDSA-P256',
        data.keyId,
        data.deviceId || null,
        data.attestationData ? JSON.stringify(data.attestationData) : null,
      ]
    );

    return this.mapRowToPublicKey(result.rows[0]);
  }

  async getById(keyId: string): Promise<UserPublicKey | null> {
    const result = await query(
      'SELECT * FROM user_public_keys WHERE key_id = $1 AND revoked_at IS NULL',
      [keyId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPublicKey(result.rows[0]);
  }

  async getByUserId(userId: string, activeOnly: boolean = true): Promise<UserPublicKey[]> {
    let queryText = 'SELECT * FROM user_public_keys WHERE user_id = $1';
    if (activeOnly) {
      queryText += ' AND revoked_at IS NULL';
    }
    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, [userId]);
    return result.rows.map(row => this.mapRowToPublicKey(row));
  }

  async revoke(keyId: string, reason?: string): Promise<UserPublicKey> {
    const result = await query(
      `UPDATE user_public_keys
       SET revoked_at = CURRENT_TIMESTAMP,
           revoked_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE key_id = $1
       RETURNING *`,
      [keyId, reason || null]
    );

    return this.mapRowToPublicKey(result.rows[0]);
  }

  private mapRowToPublicKey(row: any): UserPublicKey {
    return {
      id: row.id,
      userId: row.user_id,
      publicKeyPem: row.public_key_pem,
      keyAlgorithm: row.key_algorithm,
      keyId: row.key_id,
      deviceId: row.device_id,
      attestationData: row.attestation_data 
        ? (typeof row.attestation_data === 'string' 
            ? JSON.parse(row.attestation_data) 
            : row.attestation_data)
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revokedAt: row.revoked_at,
      revokedReason: row.revoked_reason,
    };
  }
}
