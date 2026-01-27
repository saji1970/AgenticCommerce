/**
 * CA Certificate Repository
 * Database operations for CA certificates and server configurations
 */

import { query } from '../config/database';
import crypto from 'crypto';

/**
 * CA Certificate entity
 */
export interface CACertificate {
  id: string;
  userId: string;
  fingerprint: string;
  publicKeyPem: string;
  certificatePem: string;
  issuerDn?: string;
  subjectDn?: string;
  serialNumber?: string;
  notBefore: Date;
  notAfter: Date;
  caServerUrl?: string;
  isActive: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CA Server Configuration entity
 */
export interface CAServerConfig {
  id: string;
  name: string;
  serverUrl: string;
  apiKeyEncrypted?: string;
  rootCertificatePem?: string;
  serverPublicKeyPem?: string;
  isActive: boolean;
  lastHealthCheck?: Date;
  healthStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create CA Certificate request
 */
export interface CACertificateCreate {
  userId: string;
  fingerprint: string;
  publicKeyPem: string;
  certificatePem: string;
  issuerDn?: string;
  subjectDn?: string;
  serialNumber?: string;
  notBefore: Date;
  notAfter: Date;
  caServerUrl?: string;
}

/**
 * Create CA Server Config request
 */
export interface CAServerConfigCreate {
  name: string;
  serverUrl: string;
  apiKeyEncrypted?: string;
  rootCertificatePem?: string;
  serverPublicKeyPem?: string;
}

class CACertificateRepository {
  /**
   * Create a new CA certificate record
   */
  async create(cert: CACertificateCreate): Promise<CACertificate> {
    const id = crypto.randomUUID();

    try {
      const result = await query(
        `INSERT INTO ca_certificates (
          id, user_id, fingerprint, public_key_pem, certificate_pem,
          issuer_dn, subject_dn, serial_number, not_before, not_after,
          ca_server_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING *`,
        [
          id,
          cert.userId,
          cert.fingerprint,
          cert.publicKeyPem,
          cert.certificatePem,
          cert.issuerDn || null,
          cert.subjectDn || null,
          cert.serialNumber || null,
          cert.notBefore,
          cert.notAfter,
          cert.caServerUrl || null,
        ]
      );

      return this.mapRowToCertificate(result.rows[0]);
    } catch (error: any) {
      // If table doesn't exist, return a mock certificate
      if (error.code === '42P01') {
        console.warn('[CACertificateRepository] Table does not exist, returning mock certificate');
        return this.createMockCertificate(id, cert);
      }
      throw error;
    }
  }

  /**
   * Find certificate by fingerprint
   */
  async findByFingerprint(fingerprint: string): Promise<CACertificate | null> {
    try {
      const result = await query(
        'SELECT * FROM ca_certificates WHERE fingerprint = $1 AND is_active = true',
        [fingerprint]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCertificate(result.rows[0]);
    } catch (error: any) {
      // If table doesn't exist, return null
      if (error.code === '42P01') {
        console.warn('[CACertificateRepository] Table does not exist');
        return null;
      }
      throw error;
    }
  }

  /**
   * Find certificates by user ID
   */
  async findByUserId(userId: string): Promise<CACertificate[]> {
    try {
      const result = await query(
        'SELECT * FROM ca_certificates WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      return result.rows.map(row => this.mapRowToCertificate(row));
    } catch (error: any) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.warn('[CACertificateRepository] Table does not exist');
        return [];
      }
      throw error;
    }
  }

  /**
   * Find active certificates for a user
   */
  async findActiveByUserId(userId: string): Promise<CACertificate[]> {
    try {
      const result = await query(
        `SELECT * FROM ca_certificates
         WHERE user_id = $1
           AND is_active = true
           AND not_after > CURRENT_TIMESTAMP
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map(row => this.mapRowToCertificate(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Revoke a certificate
   */
  async revoke(fingerprint: string, reason: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE ca_certificates
         SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $2, updated_at = CURRENT_TIMESTAMP
         WHERE fingerprint = $1
         RETURNING *`,
        [fingerprint, reason]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      if (error.code === '42P01') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Deactivate all certificates for a user
   */
  async deactivateAllForUser(userId: string): Promise<void> {
    try {
      await query(
        `UPDATE ca_certificates
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
    } catch (error: any) {
      if (error.code === '42P01') {
        return;
      }
      throw error;
    }
  }

  /**
   * Delete expired certificates
   */
  async deleteExpired(): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM ca_certificates
         WHERE not_after < CURRENT_TIMESTAMP - INTERVAL '30 days'`
      );

      return result.rowCount ?? 0;
    } catch (error: any) {
      if (error.code === '42P01') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Create a mock certificate when table doesn't exist
   */
  private createMockCertificate(id: string, cert: CACertificateCreate): CACertificate {
    const now = new Date();
    return {
      id,
      userId: cert.userId,
      fingerprint: cert.fingerprint,
      publicKeyPem: cert.publicKeyPem,
      certificatePem: cert.certificatePem,
      issuerDn: cert.issuerDn,
      subjectDn: cert.subjectDn,
      serialNumber: cert.serialNumber,
      notBefore: cert.notBefore,
      notAfter: cert.notAfter,
      caServerUrl: cert.caServerUrl,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Map database row to CACertificate
   */
  private mapRowToCertificate(row: any): CACertificate {
    return {
      id: row.id,
      userId: row.user_id,
      fingerprint: row.fingerprint,
      publicKeyPem: row.public_key_pem,
      certificatePem: row.certificate_pem,
      issuerDn: row.issuer_dn,
      subjectDn: row.subject_dn,
      serialNumber: row.serial_number,
      notBefore: row.not_before,
      notAfter: row.not_after,
      caServerUrl: row.ca_server_url,
      isActive: row.is_active,
      revokedAt: row.revoked_at,
      revokedReason: row.revoked_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * CA Server Configuration Repository
 */
class CAServerConfigRepository {
  /**
   * Create a new CA server configuration
   */
  async create(config: CAServerConfigCreate): Promise<CAServerConfig> {
    const id = crypto.randomUUID();

    try {
      const result = await query(
        `INSERT INTO ca_server_configs (
          id, name, server_url, api_key_encrypted, root_certificate_pem,
          server_public_key_pem, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *`,
        [
          id,
          config.name,
          config.serverUrl,
          config.apiKeyEncrypted || null,
          config.rootCertificatePem || null,
          config.serverPublicKeyPem || null,
        ]
      );

      return this.mapRowToConfig(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn('[CAServerConfigRepository] Table does not exist');
        return this.createMockConfig(id, config);
      }
      throw error;
    }
  }

  /**
   * Get active CA server configuration
   */
  async getActive(): Promise<CAServerConfig | null> {
    try {
      const result = await query(
        'SELECT * FROM ca_server_configs WHERE is_active = true LIMIT 1'
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToConfig(result.rows[0]);
    } catch (error: any) {
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update health check status
   */
  async updateHealthStatus(id: string, status: string): Promise<void> {
    try {
      await query(
        `UPDATE ca_server_configs
         SET last_health_check = CURRENT_TIMESTAMP, health_status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, status]
      );
    } catch (error: any) {
      if (error.code === '42P01') {
        return;
      }
      throw error;
    }
  }

  /**
   * Deactivate all configurations
   */
  async deactivateAll(): Promise<void> {
    try {
      await query(
        'UPDATE ca_server_configs SET is_active = false, updated_at = CURRENT_TIMESTAMP'
      );
    } catch (error: any) {
      if (error.code === '42P01') {
        return;
      }
      throw error;
    }
  }

  private createMockConfig(id: string, config: CAServerConfigCreate): CAServerConfig {
    const now = new Date();
    return {
      id,
      name: config.name,
      serverUrl: config.serverUrl,
      apiKeyEncrypted: config.apiKeyEncrypted,
      rootCertificatePem: config.rootCertificatePem,
      serverPublicKeyPem: config.serverPublicKeyPem,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapRowToConfig(row: any): CAServerConfig {
    return {
      id: row.id,
      name: row.name,
      serverUrl: row.server_url,
      apiKeyEncrypted: row.api_key_encrypted,
      rootCertificatePem: row.root_certificate_pem,
      serverPublicKeyPem: row.server_public_key_pem,
      isActive: row.is_active,
      lastHealthCheck: row.last_health_check,
      healthStatus: row.health_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const caCertificateRepository = new CACertificateRepository();
export const caServerConfigRepository = new CAServerConfigRepository();
