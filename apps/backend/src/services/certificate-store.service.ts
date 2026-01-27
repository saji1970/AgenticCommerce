/**
 * Certificate Store Service
 * Manages storage and retrieval of CA certificates and public keys
 * for signature verification.
 */

import { caCertificateRepository, CACertificate, CACertificateCreate } from '../repositories/ca-certificate.repository';

// Test mode detection prefix
const TEST_CERT_PREFIX = 'test_cert_demo_';

// Test mode public key for demo certificates
const TEST_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtest_demo_public_key_for_development_
only_this_is_not_a_real_public_key_but_will_work_for_demo_purposes_please_do_
not_use_this_in_any_production_environment
-----END PUBLIC KEY-----`;

export interface StoredCertificate {
  id: string;
  userId: string;
  fingerprint: string;
  publicKeyPem: string;
  certificatePem: string;
  issuerDn: string;
  subjectDn: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  caServerUrl?: string;
  isActive: boolean;
  isTestMode: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

class CertificateStoreService {
  /**
   * Check if a fingerprint indicates test mode
   */
  isTestCertificate(fingerprint: string): boolean {
    return fingerprint.startsWith(TEST_CERT_PREFIX);
  }

  /**
   * Get certificate by fingerprint
   */
  async getCertificateByFingerprint(fingerprint: string): Promise<StoredCertificate | null> {
    // Handle test mode certificates
    if (this.isTestCertificate(fingerprint)) {
      console.log('[CertificateStore] Returning test mode certificate for fingerprint:', fingerprint);
      return this.getTestCertificate(fingerprint);
    }

    try {
      const cert = await caCertificateRepository.findByFingerprint(fingerprint);
      if (!cert) {
        return null;
      }

      return this.mapToCertificate(cert);
    } catch (error) {
      console.error('[CertificateStore] Error fetching certificate:', error);
      return null;
    }
  }

  /**
   * Get active certificates for a user
   */
  async getUserCertificates(userId: string): Promise<StoredCertificate[]> {
    try {
      const certs = await caCertificateRepository.findByUserId(userId);
      return certs.map(cert => this.mapToCertificate(cert));
    } catch (error) {
      console.error('[CertificateStore] Error fetching user certificates:', error);
      return [];
    }
  }

  /**
   * Store a new certificate
   */
  async storeCertificate(cert: Omit<CACertificateCreate, 'id'>): Promise<StoredCertificate> {
    try {
      const created = await caCertificateRepository.create(cert);
      return this.mapToCertificate(created);
    } catch (error) {
      console.error('[CertificateStore] Error storing certificate:', error);
      throw error;
    }
  }

  /**
   * Revoke a certificate
   */
  async revokeCertificate(fingerprint: string, reason: string): Promise<boolean> {
    try {
      return await caCertificateRepository.revoke(fingerprint, reason);
    } catch (error) {
      console.error('[CertificateStore] Error revoking certificate:', error);
      return false;
    }
  }

  /**
   * Check if a certificate is valid (not expired and not revoked)
   */
  async isCertificateValid(fingerprint: string): Promise<boolean> {
    // Test certificates are always valid for demo purposes
    if (this.isTestCertificate(fingerprint)) {
      return true;
    }

    try {
      const cert = await this.getCertificateByFingerprint(fingerprint);
      if (!cert) {
        return false;
      }

      const now = new Date();
      return (
        cert.isActive &&
        now >= cert.notBefore &&
        now <= cert.notAfter &&
        !cert.revokedAt
      );
    } catch (error) {
      console.error('[CertificateStore] Error checking certificate validity:', error);
      return false;
    }
  }

  /**
   * Get the public key for a certificate fingerprint
   */
  async getPublicKey(fingerprint: string): Promise<string | null> {
    // Test certificates use test public key
    if (this.isTestCertificate(fingerprint)) {
      return TEST_PUBLIC_KEY_PEM;
    }

    const cert = await this.getCertificateByFingerprint(fingerprint);
    return cert?.publicKeyPem || null;
  }

  /**
   * Create a test mode certificate (for demo/development)
   */
  private getTestCertificate(fingerprint: string): StoredCertificate {
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    return {
      id: `test_${fingerprint}`,
      userId: 'test_user',
      fingerprint,
      publicKeyPem: TEST_PUBLIC_KEY_PEM,
      certificatePem: `-----BEGIN CERTIFICATE-----\ntest_certificate_for_${fingerprint}\n-----END CERTIFICATE-----`,
      issuerDn: 'CN=Test CA Dev Only, O=AgenticCommerce Demo, C=US',
      subjectDn: 'CN=Test Client, O=AgenticCommerce Demo, C=US',
      serialNumber: `TEST-${Date.now()}`,
      notBefore: now,
      notAfter: oneYearFromNow,
      isActive: true,
      isTestMode: true,
    };
  }

  /**
   * Map database certificate to StoredCertificate
   */
  private mapToCertificate(cert: CACertificate): StoredCertificate {
    return {
      id: cert.id,
      userId: cert.userId,
      fingerprint: cert.fingerprint,
      publicKeyPem: cert.publicKeyPem,
      certificatePem: cert.certificatePem,
      issuerDn: cert.issuerDn || '',
      subjectDn: cert.subjectDn || '',
      serialNumber: cert.serialNumber || '',
      notBefore: cert.notBefore,
      notAfter: cert.notAfter,
      caServerUrl: cert.caServerUrl,
      isActive: cert.isActive,
      isTestMode: this.isTestCertificate(cert.fingerprint),
      revokedAt: cert.revokedAt,
      revokedReason: cert.revokedReason,
    };
  }
}

export const certificateStoreService = new CertificateStoreService();
export default certificateStoreService;
