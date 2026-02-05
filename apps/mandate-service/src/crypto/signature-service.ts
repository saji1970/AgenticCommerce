/**
 * Signature Service
 * Creates and verifies digital signatures.
 * All signatures include timestamps. Verification fails closed.
 */

import crypto from 'crypto';

export interface SignaturePayload {
  data: string;
  timestamp: string;  // ISO-8601
  nonce?: string;
}

export interface SignedMessage {
  data: string;
  signature: string;  // base64
  timestamp: string;
  algorithm: 'Ed25519' | 'RSA-SHA256';
  keyFingerprint: string;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  expiredTimestamp?: boolean;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export class SignatureService {
  /**
   * Sign data with a private key. Always includes timestamp.
   */
  sign(
    data: string,
    privateKeyPem: string,
    algorithm: 'Ed25519' | 'RSA-SHA256',
    publicKeyFingerprint: string,
    nonce?: string,
  ): SignedMessage {
    const timestamp = new Date().toISOString();
    const payload = this.buildSignatureInput(data, timestamp, nonce);

    let signature: Buffer;

    if (algorithm === 'Ed25519') {
      signature = crypto.sign(null, Buffer.from(payload), privateKeyPem);
    } else {
      const signer = crypto.createSign('SHA256');
      signer.update(payload);
      signature = signer.sign(privateKeyPem);
    }

    return {
      data,
      signature: signature.toString('base64'),
      timestamp,
      algorithm,
      keyFingerprint: publicKeyFingerprint,
    };
  }

  /**
   * Verify a signature. Fails closed: any error returns valid: false.
   * Checks timestamp freshness by default.
   */
  verify(
    signedMessage: SignedMessage,
    publicKeyPem: string,
    options: { maxAgeMs?: number; nonce?: string } = {},
  ): VerificationResult {
    const maxAge = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

    try {
      // 1. Check timestamp freshness
      const signedAt = new Date(signedMessage.timestamp);
      if (isNaN(signedAt.getTime())) {
        return { valid: false, error: 'Invalid timestamp format' };
      }

      const age = Date.now() - signedAt.getTime();
      if (age > maxAge) {
        return { valid: false, error: 'Signature expired', expiredTimestamp: true };
      }
      if (age < -30000) {
        // Clock skew tolerance: 30 seconds into the future
        return { valid: false, error: 'Signature timestamp in the future' };
      }

      // 2. Reconstruct the signed payload
      const payload = this.buildSignatureInput(
        signedMessage.data,
        signedMessage.timestamp,
        options.nonce,
      );

      const signatureBuffer = Buffer.from(signedMessage.signature, 'base64');

      // 3. Verify
      let isValid: boolean;

      if (signedMessage.algorithm === 'Ed25519') {
        isValid = crypto.verify(null, Buffer.from(payload), publicKeyPem, signatureBuffer);
      } else {
        const verifier = crypto.createVerify('SHA256');
        verifier.update(payload);
        isValid = verifier.verify(publicKeyPem, signatureBuffer);
      }

      if (!isValid) {
        return { valid: false, error: 'Signature verification failed' };
      }

      return { valid: true };
    } catch (err) {
      // Fail closed: any exception means invalid
      const message = err instanceof Error ? err.message : 'Unknown verification error';
      return { valid: false, error: message };
    }
  }

  /**
   * Build deterministic signature input string.
   * Format: data|timestamp[|nonce]
   */
  private buildSignatureInput(data: string, timestamp: string, nonce?: string): string {
    const parts = [data, timestamp];
    if (nonce) parts.push(nonce);
    return parts.join('|');
  }

  /**
   * Verify a raw signature (for mandate user signatures).
   * Used when the SignedMessage wrapper isn't available.
   */
  verifyRaw(
    data: string,
    signatureBase64: string,
    publicKeyPem: string,
    algorithm: 'Ed25519' | 'RSA-SHA256',
  ): boolean {
    try {
      const sigBuffer = Buffer.from(signatureBase64, 'base64');
      if (algorithm === 'Ed25519') {
        return crypto.verify(null, Buffer.from(data), publicKeyPem, sigBuffer);
      }
      const verifier = crypto.createVerify('SHA256');
      verifier.update(data);
      return verifier.verify(publicKeyPem, sigBuffer);
    } catch {
      return false; // fail closed
    }
  }
}

export const signatureService = new SignatureService();
