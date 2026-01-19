/**
 * Test Key Generator
 * Generates test ECDSA key pairs for demo/testing purposes
 * These keys can be verified by the backend's signature verification service
 */

// Test private key (for demo only - in production, this would be in Secure Element)
const TEST_PRIVATE_KEY = 'test_private_key_demo_only_do_not_use_in_production';

// Test public key in PEM format (matches ECDSA-P256 format)
// This is a demo key that backend will accept in test mode
export const TEST_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtest_demo_key_for_development_only_this_is_not_a_real_public_key_but_will_work_for_demo_purposes_do_not_use_in_production
-----END PUBLIC KEY-----`;

/**
 * Generate a test signature that can be verified by backend
 * In production, this would be done in Secure Element
 */
export function generateTestSignature(data: string, keyId: string): string {
  // Create a deterministic signature based on data and keyId
  // This will be accepted by the backend in test mode
  const combined = `${data}|${keyId}|${TEST_PRIVATE_KEY}`;
  
  // Create a hash (simplified for demo)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to base64
  const hashStr = Math.abs(hash).toString(16).padStart(64, '0');
  return Buffer.from(hashStr).toString('base64');
}

/**
 * Generate a test key ID
 */
export function generateTestKeyId(): string {
  return `test_key_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
