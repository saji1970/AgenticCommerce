/**
 * Artifact Signer
 * Signs payment authorization artifacts with the server's private key.
 * Each artifact is a cryptographic proof that the server authorized a specific payment.
 */

import crypto from 'crypto';
import { keyManager } from './key-manager';
// signatureService used for timestamped message signing; artifact uses raw signing

export interface AuthorizationArtifactContent {
  artifactId: string;
  mandateId: string;
  userId: string;
  agentId: string;
  merchantId?: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  issuedAt: string;   // ISO-8601
  expiresAt: string;   // ISO-8601
}

export interface SignedAuthorizationArtifact {
  content: AuthorizationArtifactContent;
  artifactHash: string;
  serverSignature: string;  // base64
  signatureAlgorithm: string;
  serverKeyFingerprint: string;
}

export class ArtifactSigner {
  /**
   * Sign a payment authorization artifact with the server's key.
   * The artifact binds: who, what amount, for which mandate, with what idempotency key.
   */
  async signArtifact(content: AuthorizationArtifactContent): Promise<SignedAuthorizationArtifact> {
    const serverKey = await keyManager.getServerKeyPair();

    // Compute deterministic hash of artifact content
    const canonical = JSON.stringify(content, Object.keys(content).sort());
    const artifactHash = crypto.createHash('sha256').update(canonical).digest('hex');

    // Sign the hash directly with server's private key (no timestamp wrapper —
    // the artifact content already contains issuedAt for time binding)
    let signature: Buffer;
    if (serverKey.algorithm === 'Ed25519') {
      signature = crypto.sign(null, Buffer.from(artifactHash), serverKey.privateKey);
    } else {
      const signer = crypto.createSign('SHA256');
      signer.update(artifactHash);
      signature = signer.sign(serverKey.privateKey);
    }

    return {
      content,
      artifactHash,
      serverSignature: signature.toString('base64'),
      signatureAlgorithm: serverKey.algorithm,
      serverKeyFingerprint: serverKey.fingerprint,
    };
  }

  /**
   * Verify a previously issued artifact.
   * Checks: hash matches content, signature is valid, artifact not expired.
   */
  async verifyArtifact(artifact: SignedAuthorizationArtifact): Promise<{ valid: boolean; error?: string }> {
    try {
      const serverKey = await keyManager.getServerKeyPair();

      // Re-compute hash from content
      const canonical = JSON.stringify(artifact.content, Object.keys(artifact.content).sort());
      const computedHash = crypto.createHash('sha256').update(canonical).digest('hex');

      if (computedHash !== artifact.artifactHash) {
        return { valid: false, error: 'Artifact content hash mismatch - possible tampering' };
      }

      // Check expiry
      const expiresAt = new Date(artifact.content.expiresAt);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'Authorization artifact expired' };
      }

      // Verify server signature
      const sigBuffer = Buffer.from(artifact.serverSignature, 'base64');
      let isValid: boolean;

      if (artifact.signatureAlgorithm === 'Ed25519') {
        isValid = crypto.verify(null, Buffer.from(artifact.artifactHash), serverKey.publicKey, sigBuffer);
      } else {
        const verifier = crypto.createVerify('SHA256');
        verifier.update(artifact.artifactHash);
        isValid = verifier.verify(serverKey.publicKey, sigBuffer);
      }

      if (!isValid) {
        return { valid: false, error: 'Server signature verification failed' };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Verification error' };
    }
  }
}

export const artifactSigner = new ArtifactSigner();
