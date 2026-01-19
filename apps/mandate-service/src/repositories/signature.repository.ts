import { query } from '../config/database';

export interface MandateSignature {
  id: string;
  mandateId: string;
  userId: string;
  publicKeyId: string;
  mandateText: string;
  mandateHash: string;
  signatureData: string;
  signatureImageUrl?: string;
  signatureTimestamp: Date;
  verifiedAt?: Date;
  verificationStatus: 'pending' | 'verified' | 'failed' | 'expired';
  verificationError?: string;
  deviceInfo?: Record<string, any>;
  biometricType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSignatureRequest {
  mandateId: string;
  userId: string;
  publicKeyId: string;
  mandateText: string;
  mandateHash: string;
  signatureData: string;
  signatureImageUrl?: string;
  signatureTimestamp: Date;
  deviceInfo?: Record<string, any>;
  biometricType?: string;
}

export interface UpdateVerificationRequest {
  verificationStatus: 'pending' | 'verified' | 'failed' | 'expired';
  verificationError?: string;
}

export class SignatureRepository {
  async create(data: CreateSignatureRequest): Promise<MandateSignature> {
    const result = await query(
      `INSERT INTO mandate_signatures (
        mandate_id, user_id, public_key_id, mandate_text, mandate_hash,
        signature_data, signature_image_url, signature_timestamp,
        device_info, biometric_type, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *`,
      [
        data.mandateId,
        data.userId,
        data.publicKeyId,
        data.mandateText,
        data.mandateHash,
        data.signatureData,
        data.signatureImageUrl || null,
        data.signatureTimestamp,
        data.deviceInfo ? JSON.stringify(data.deviceInfo) : null,
        data.biometricType || null,
      ]
    );

    return this.mapRowToSignature(result.rows[0]);
  }

  async getById(signatureId: string): Promise<MandateSignature | null> {
    const result = await query(
      'SELECT * FROM mandate_signatures WHERE id = $1',
      [signatureId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSignature(result.rows[0]);
  }

  async getByMandateId(mandateId: string): Promise<MandateSignature | null> {
    const result = await query(
      'SELECT * FROM mandate_signatures WHERE mandate_id = $1 ORDER BY created_at DESC LIMIT 1',
      [mandateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSignature(result.rows[0]);
  }

  async updateVerification(
    signatureId: string,
    data: UpdateVerificationRequest
  ): Promise<MandateSignature> {
    const result = await query(
      `UPDATE mandate_signatures
       SET verification_status = $2,
           verification_error = $3,
           verified_at = CASE WHEN $2 = 'verified' THEN CURRENT_TIMESTAMP ELSE verified_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        signatureId,
        data.verificationStatus,
        data.verificationError || null,
      ]
    );

    return this.mapRowToSignature(result.rows[0]);
  }

  async linkToMandate(mandateId: string, signatureId: string): Promise<void> {
    await query(
      'UPDATE agent_mandates SET signature_id = $1 WHERE id = $2',
      [signatureId, mandateId]
    );
  }

  private mapRowToSignature(row: any): MandateSignature {
    return {
      id: row.id,
      mandateId: row.mandate_id,
      userId: row.user_id,
      publicKeyId: row.public_key_id,
      mandateText: row.mandate_text,
      mandateHash: row.mandate_hash,
      signatureData: row.signature_data,
      signatureImageUrl: row.signature_image_url,
      signatureTimestamp: row.signature_timestamp,
      verifiedAt: row.verified_at,
      verificationStatus: row.verification_status,
      verificationError: row.verification_error,
      deviceInfo: row.device_info
        ? (typeof row.device_info === 'string'
            ? JSON.parse(row.device_info)
            : row.device_info)
        : undefined,
      biometricType: row.biometric_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
