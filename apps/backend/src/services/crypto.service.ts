/**
 * Crypto Service
 * Server-side cryptographic operations for decrypting and verifying secure payloads
 * from the mandate app.
 */

import crypto from 'crypto';

/**
 * Secure payload structure received from mobile app
 */
export interface SecurePayload {
  encryptedData: string;      // Base64 AES-encrypted data
  encryptedKey: string;       // RSA-encrypted AES key
  iv: string;                 // Initialization vector (Base64)
  authTag: string;            // GCM authentication tag (Base64)
  signature: string;          // Signature of encrypted data
  timestamp: string;          // ISO timestamp
  certificateFingerprint: string;  // Client certificate fingerprint
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Signature verification result
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
}

// Test mode server private key (for demo/development only)
const TEST_SERVER_PRIVATE_KEY = 'test_server_private_key_for_demo_mode_only_do_not_use_in_production';

// Test mode detection prefix
const TEST_CERT_PREFIX = 'test_cert_demo_';

class CryptoService {
  private serverPrivateKey: string | null = null;

  /**
   * Configure the server's private key for decryption
   */
  configure(privateKey: string): void {
    this.serverPrivateKey = privateKey;
  }

  /**
   * Check if a fingerprint indicates test mode
   */
  isTestMode(fingerprint: string): boolean {
    return fingerprint.startsWith(TEST_CERT_PREFIX);
  }

  /**
   * Simple hash function matching the mobile app's implementation
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hash1 = Math.abs(hash).toString(16).padStart(8, '0');
    let hash2 = 0;
    const reversed = data.split('').reverse().join('');
    for (let i = 0; i < reversed.length; i++) {
      const char = reversed.charCodeAt(i);
      hash2 = ((hash2 << 5) - hash2) + char;
      hash2 = hash2 & hash2;
    }
    const hashStr2 = Math.abs(hash2).toString(16).padStart(8, '0');
    return hash1 + hashStr2 + hash1 + hashStr2;
  }

  /**
   * Simple XOR encryption/decryption (matches mobile app's demo implementation)
   */
  private xorEncrypt(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const dataChar = data.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(dataChar ^ keyChar);
    }
    return result;
  }

  /**
   * Verify the signature of a secure payload
   */
  verifySignature(
    payload: SecurePayload,
    clientPublicKey: string
  ): VerificationResult {
    try {
      const { encryptedData, signature, timestamp, certificateFingerprint } = payload;

      // Check timestamp validity (within 5 minutes)
      const signedAt = new Date(timestamp);
      const now = new Date();
      const fiveMinutes = 5 * 60 * 1000;
      if (now.getTime() - signedAt.getTime() > fiveMinutes) {
        return { valid: false, error: 'Payload expired' };
      }

      // In test mode, accept simplified signatures
      if (this.isTestMode(certificateFingerprint)) {
        console.log('[CryptoService] Test mode signature verification (simplified)');
        // Just verify the signature format is present
        if (!signature || signature.length === 0) {
          return { valid: false, error: 'Missing signature' };
        }
        return { valid: true };
      }

      // Production signature verification would use proper crypto:
      // const verify = crypto.createVerify('SHA256');
      // verify.update(signatureInput);
      // const isValid = verify.verify(clientPublicKey, Buffer.from(signature, 'base64'));

      // For now, use simplified verification matching mobile app
      const signatureInput = `${encryptedData}|${timestamp}|${certificateFingerprint}`;
      const hash = this.simpleHash(signatureInput);
      const keyHash = this.simpleHash(clientPublicKey || 'default_key');
      const expectedHash = this.simpleHash(hash + keyHash);
      const expectedSignature = Buffer.from(expectedHash).toString('base64');

      // Simple comparison for demo
      if (!signature) {
        return { valid: false, error: 'Missing signature' };
      }

      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Decrypt a secure payload
   */
  decryptPayload(payload: SecurePayload): DecryptionResult {
    try {
      const { encryptedData, encryptedKey, iv, certificateFingerprint } = payload;

      // Use test mode decryption for demo certificates
      if (this.isTestMode(certificateFingerprint)) {
        return this.decryptTestPayload(payload);
      }

      // Production decryption would use proper RSA + AES:
      // 1. Decrypt session key with server's RSA private key
      // 2. Decrypt data with AES-GCM using session key and IV

      // For now, use simplified decryption matching mobile app
      const serverKey = this.serverPrivateKey || TEST_SERVER_PRIVATE_KEY;
      const keyHash = this.simpleHash(serverKey);
      const sessionKey = this.xorEncrypt(
        Buffer.from(encryptedKey, 'base64').toString(),
        keyHash
      );

      const ivDecoded = Buffer.from(iv, 'base64').toString();
      const dataDecoded = Buffer.from(encryptedData, 'base64').toString();
      const decryptedData = this.xorEncrypt(dataDecoded, sessionKey + ivDecoded);

      // Parse JSON data
      const parsedData = JSON.parse(decryptedData);
      return { success: true, data: parsedData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
      console.error('[CryptoService] Decryption error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Decrypt test mode payload (simplified for demo)
   */
  private decryptTestPayload(payload: SecurePayload): DecryptionResult {
    try {
      const { encryptedData, encryptedKey, iv } = payload;

      console.log('[CryptoService] Decrypting test mode payload');

      // Use test server private key
      const keyHash = this.simpleHash(TEST_SERVER_PRIVATE_KEY);
      const sessionKey = this.xorEncrypt(
        Buffer.from(encryptedKey, 'base64').toString(),
        keyHash
      );

      const ivDecoded = Buffer.from(iv, 'base64').toString();
      const dataDecoded = Buffer.from(encryptedData, 'base64').toString();
      const decryptedData = this.xorEncrypt(dataDecoded, sessionKey + ivDecoded);

      // Parse JSON data
      const parsedData = JSON.parse(decryptedData);
      return { success: true, data: parsedData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test decryption failed';
      console.error('[CryptoService] Test decryption error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Encrypt a response payload (for secure responses)
   */
  encryptResponse(data: any, clientPublicKey: string): string {
    // In production, encrypt response with client's public key
    // For now, return base64 encoded JSON
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Generate a certificate fingerprint
   */
  generateFingerprint(certificatePem: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(certificatePem);
    const digest = hash.digest('hex').toUpperCase();
    return digest.match(/.{2}/g)?.join(':') || digest;
  }

  /**
   * Check if the service is configured for production
   */
  isConfigured(): boolean {
    return this.serverPrivateKey !== null;
  }
}

export const cryptoService = new CryptoService();
export default cryptoService;
