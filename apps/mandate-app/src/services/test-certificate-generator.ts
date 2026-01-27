/**
 * Test Certificate Generator
 * Generates demo certificates for test mode when no CA server is configured.
 * These certificates are marked as test certificates and will be accepted
 * by the backend in development/test mode only.
 *
 * WARNING: These certificates are NOT secure and should NEVER be used in production.
 */

// Test CA certificate (self-signed root)
export const TEST_CA_CERTIFICATE_PEM = `-----BEGIN CERTIFICATE-----
MIIB8TCCAZegAwIBAgIUTESTQ0FERVZDTE9QTUVOVENP0k9PVDAKBggqhkjOPQQD
AjBGMQswCQYDVQQGEwJVUzEcMBoGA1UECgwTQWdlbnRpY0NvbW1lcmNlIERlbW8x
GTAXBgNVBAMMEFRlc3QgQ0EgRGV2IE9ubHkwIBcNMjQwMTAxMDAwMDAwWhgPMjEy
NDAxMDEwMDAwMDBaMEYxCzAJBgNVBAYTAlVTMRwwGgYDVQQKDBNBZ2VudGljQ29t
bWVyY2UgRGVtbzEZMBcGA1UEAwwQVGVzdCBDQSBEZXYgT25seTBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABHRlc3RfY2FfcHVibGljX2tleV9mb3JfZGVtb19vbmx5
X3RoaXNfaXNfbm90X2FfcmVhbF9rZXlfYnV0X3dvcmtzX2Zvcl90ZXN0aW5no1Mw
UTAdBgNVHQ4EFgQUVEVTVF9DQV9ERVZfT05MWV9JRDBQP7aPxAfBgNVHSMEGDAW
gBRURVNUX0NBX0RFVl9PTkxZX0lEMB8GA1UdEwEB/wQFMAMBAf8wCgYIKoZIzj0E
AwIDSAAwRQIhAJRlc3RfY2Ffc2lnbmF0dXJlX2Zvcl9kZW1vX29ubHkCIF90ZXN0
X2NhX3NpZ25hdHVyZV9wYXJ0XzJfZGVtbw==
-----END CERTIFICATE-----`;

// Test private key for client certificates
const TEST_PRIVATE_KEY = 'test_private_key_demo_only_do_not_use_in_production_' + Date.now();

// Test public key in PEM format
export const TEST_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtest_demo_public_key_for_development_
only_this_is_not_a_real_public_key_but_will_work_for_demo_purposes_please_do_
not_use_this_in_any_production_environment
-----END PUBLIC KEY-----`;

// Test server public key (for encryption)
export const TEST_SERVER_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtest_server_public_key_for_encrypting
_payloads_in_demo_mode_only_this_is_not_secure_and_should_never_be_used_in_
production_environments_please_configure_real_ca
-----END PUBLIC KEY-----`;

/**
 * Test certificate structure
 */
export interface TestCertificate {
  certificate: string;       // PEM certificate
  privateKey: string;        // PEM private key
  publicKey: string;         // PEM public key
  fingerprint: string;       // Unique fingerprint with test prefix
  issuer: string;            // Issuer DN
  subject: string;           // Subject DN
  serialNumber: string;      // Serial number
  notBefore: Date;           // Validity start
  notAfter: Date;            // Validity end
  isTestMode: true;          // Always true for test certs
}

/**
 * Generate a demo certificate fingerprint with test prefix
 */
function generateTestFingerprint(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `test_cert_demo_${timestamp}_${random}`;
}

/**
 * Generate a test certificate for demo mode
 * This certificate will be accepted by the backend in test mode only
 */
export function generateTestCertificate(userId?: string): TestCertificate {
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const fingerprint = generateTestFingerprint();
  const serialNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Generate a unique certificate for this user/session
  const uniqueSuffix = userId || Math.random().toString(36).substring(2);
  const certificatePem = `-----BEGIN CERTIFICATE-----
MIIB4TCCAYegAwIBAgIU${serialNumber}TAKBggqhkjOPQQDAjBGMQsw
CQYDVQQGEwJVUzEcMBoGA1UECgwTQWdlbnRpY0NvbW1lcmNlIERlbW8xGTAXBgNV
BAMMEFRlc3QgQ0EgRGV2IE9ubHkwIBcN${now.toISOString().replace(/[-:TZ.]/g, '').substring(0, 14)}
WhgP${oneYearFromNow.toISOString().replace(/[-:TZ.]/g, '').substring(0, 14)}ZDBJMQswCQYDVQQGEwJVUzEc
MBoGA1UECgwTQWdlbnRpY0NvbW1lcmNlIERlbW8xHDAaBgNVBAMME1Rlc3QgQ2xp
ZW50ICR7uniqueSuffix}MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE${fingerprint}
${uniqueSuffix}_demo_public_key_content_placeholder_for_testing_purposes_only
-----END CERTIFICATE-----`;

  const privateKeyPem = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIFRlc3RfcHJpdmF0ZV9rZXlfZm9yXyR7fingerprint}X18ke3VuaXF1ZVN1
ZmZpeH1fZGVtb19vbmx5X25vdF9mb3JfcHJvZHVjdGlvbqAHBgUrgQQACqFEA0IA
BHRlc3RfcHVibGljX2tleV9jb250ZW50X2Zvcl9kZW1vX29ubHk=
-----END EC PRIVATE KEY-----`;

  return {
    certificate: certificatePem,
    privateKey: privateKeyPem,
    publicKey: TEST_PUBLIC_KEY_PEM,
    fingerprint,
    issuer: 'CN=Test CA Dev Only, O=AgenticCommerce Demo, C=US',
    subject: `CN=Test Client ${uniqueSuffix}, O=AgenticCommerce Demo, C=US`,
    serialNumber,
    notBefore: now,
    notAfter: oneYearFromNow,
    isTestMode: true,
  };
}

/**
 * Generate a test signature that matches the fingerprint pattern
 * Backend will accept this in test mode
 */
export function generateTestSignature(data: string, fingerprint: string): string {
  // Create a deterministic signature based on data and fingerprint
  const combined = `${data}|${fingerprint}|${TEST_PRIVATE_KEY}`;

  // Create a hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const hashStr = Math.abs(hash).toString(16).padStart(64, '0');

  // Encode to base64
  try {
    return btoa(hashStr);
  } catch {
    return hashStr;
  }
}

/**
 * Check if a fingerprint indicates test mode
 */
export function isTestCertificateFingerprint(fingerprint: string): boolean {
  return fingerprint.startsWith('test_cert_demo_');
}

/**
 * Get the test server public key for encrypting payloads in demo mode
 */
export function getTestServerPublicKey(): string {
  return TEST_SERVER_PUBLIC_KEY_PEM;
}

/**
 * Get the test CA root certificate
 */
export function getTestCARootCertificate(): string {
  return TEST_CA_CERTIFICATE_PEM;
}

/**
 * Validate a test certificate (simplified validation for demo)
 */
export function validateTestCertificate(cert: TestCertificate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const now = new Date();

  if (!cert.isTestMode) {
    errors.push('Certificate is not marked as test mode');
  }

  if (!isTestCertificateFingerprint(cert.fingerprint)) {
    errors.push('Fingerprint does not have test mode prefix');
  }

  if (now < cert.notBefore) {
    errors.push('Certificate not yet valid');
  }

  if (now > cert.notAfter) {
    errors.push('Certificate has expired');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
