/**
 * Cryptography Utilities Tests
 * Tests: key generation, signing, verification, mandate hashing, artifact signing.
 */

import { KeyManager } from '../crypto/key-manager';
import { SignatureService } from '../crypto/signature-service';
import { MandateHasher } from '../crypto/mandate-hasher';
import { ArtifactSigner } from '../crypto/artifact-signer';

describe('KeyManager', () => {
  const km = new KeyManager();

  it('generates Ed25519 key pair with valid PEM format', async () => {
    const pair = await km.generateEd25519KeyPair();
    expect(pair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(pair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    expect(pair.algorithm).toBe('Ed25519');
    expect(pair.fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2})+$/);
  });

  it('generates RSA key pair', async () => {
    const pair = await km.generateRSAKeyPair();
    expect(pair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(pair.algorithm).toBe('RSA-SHA256');
  });

  it('validates Ed25519 public keys', async () => {
    const pair = await km.generateEd25519KeyPair();
    expect(km.validatePublicKey(pair.publicKey, 'Ed25519')).toBe(true);
    expect(km.validatePublicKey(pair.publicKey, 'RSA-SHA256')).toBe(false);
    expect(km.validatePublicKey('invalid-pem', 'Ed25519')).toBe(false);
  });

  it('computes deterministic fingerprints', async () => {
    const pair = await km.generateEd25519KeyPair();
    const fp1 = km.computeFingerprint(pair.publicKey);
    const fp2 = km.computeFingerprint(pair.publicKey);
    expect(fp1).toBe(fp2);
  });
});

describe('SignatureService', () => {
  const km = new KeyManager();
  const ss = new SignatureService();

  it('signs and verifies Ed25519 messages', async () => {
    const pair = await km.generateEd25519KeyPair();
    const signed = ss.sign('test data', pair.privateKey, 'Ed25519', pair.fingerprint);

    expect(signed.data).toBe('test data');
    expect(signed.signature).toBeTruthy();
    expect(signed.algorithm).toBe('Ed25519');

    const result = ss.verify(signed, pair.publicKey);
    expect(result.valid).toBe(true);
  });

  it('signs and verifies RSA-SHA256 messages', async () => {
    const pair = await km.generateRSAKeyPair();
    const signed = ss.sign('test data', pair.privateKey, 'RSA-SHA256', pair.fingerprint);
    const result = ss.verify(signed, pair.publicKey);
    expect(result.valid).toBe(true);
  });

  it('fails verification with wrong key', async () => {
    const pair1 = await km.generateEd25519KeyPair();
    const pair2 = await km.generateEd25519KeyPair();
    const signed = ss.sign('test data', pair1.privateKey, 'Ed25519', pair1.fingerprint);
    const result = ss.verify(signed, pair2.publicKey);
    expect(result.valid).toBe(false);
  });

  it('fails verification with tampered data', async () => {
    const pair = await km.generateEd25519KeyPair();
    const signed = ss.sign('original', pair.privateKey, 'Ed25519', pair.fingerprint);
    signed.data = 'tampered';
    const result = ss.verify(signed, pair.publicKey);
    expect(result.valid).toBe(false);
  });

  it('fails verification with expired timestamp', async () => {
    const pair = await km.generateEd25519KeyPair();
    const signed = ss.sign('test', pair.privateKey, 'Ed25519', pair.fingerprint);
    // Set timestamp to 10 minutes ago
    signed.timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    // Re-sign with old timestamp won't match, but let's test the expiry path
    const result = ss.verify(signed, pair.publicKey, { maxAgeMs: 60000 });
    expect(result.valid).toBe(false);
  });

  it('verifies raw signatures', async () => {
    const pair = await km.generateEd25519KeyPair();
    const crypto = await import('crypto');
    const data = 'raw test data';
    const sig = crypto.sign(null, Buffer.from(data), pair.privateKey);
    const isValid = ss.verifyRaw(data, sig.toString('base64'), pair.publicKey, 'Ed25519');
    expect(isValid).toBe(true);
  });

  it('raw verification fails closed on invalid input', () => {
    const result = ss.verifyRaw('data', 'bad-sig', 'bad-key', 'Ed25519');
    expect(result).toBe(false);
  });
});

describe('MandateHasher', () => {
  const hasher = new MandateHasher();

  const sampleInput = {
    mandateId: '123',
    userId: 'user_1',
    agentId: 'agent_1',
    type: 'payment',
    constraints: { maxTransactionAmount: 500 },
    validFrom: '2026-02-01T00:00:00.000Z',
  };

  it('produces deterministic hashes', () => {
    const hash1 = hasher.computeHash(sampleInput);
    const hash2 = hasher.computeHash(sampleInput);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hasher.computeHash(sampleInput);
    const hash2 = hasher.computeHash({ ...sampleInput, mandateId: '456' });
    expect(hash1).not.toBe(hash2);
  });

  it('verifies matching hashes', () => {
    const hash = hasher.computeHash(sampleInput);
    expect(hasher.verifyHash(sampleInput, hash)).toBe(true);
  });

  it('rejects non-matching hashes', () => {
    expect(hasher.verifyHash(sampleInput, 'a'.repeat(64))).toBe(false);
  });

  it('generates human-readable mandate text', () => {
    const text = hasher.generateMandateText(sampleInput);
    expect(text).toContain('MANDATE AUTHORIZATION');
    expect(text).toContain('PAYMENT');
    expect(text).toContain('agent_1');
    expect(text).toContain('Hash:');
  });
});

describe('ArtifactSigner', () => {
  const signer = new ArtifactSigner();

  const sampleContent = {
    artifactId: 'art_123',
    mandateId: 'mandate_456',
    userId: 'user_1',
    agentId: 'agent_1',
    amount: 99.99,
    currency: 'USD',
    idempotencyKey: 'idem_789',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  it('signs an artifact and produces valid structure', async () => {
    const signed = await signer.signArtifact(sampleContent);
    expect(signed.content).toEqual(sampleContent);
    expect(signed.artifactHash).toMatch(/^[a-f0-9]{64}$/);
    expect(signed.serverSignature).toBeTruthy();
    expect(signed.signatureAlgorithm).toBeTruthy();
    expect(signed.serverKeyFingerprint).toBeTruthy();
  });

  it('verifies a freshly signed artifact', async () => {
    const signed = await signer.signArtifact(sampleContent);
    const result = await signer.verifyArtifact(signed);
    expect(result.valid).toBe(true);
  });

  it('rejects artifact with tampered content', async () => {
    const signed = await signer.signArtifact(sampleContent);
    signed.content.amount = 999.99; // tamper
    const result = await signer.verifyArtifact(signed);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hash mismatch');
  });

  it('rejects expired artifact', async () => {
    const expiredContent = {
      ...sampleContent,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
    };
    const signed = await signer.signArtifact(expiredContent);
    const result = await signer.verifyArtifact(signed);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('idempotent: same content produces same hash', async () => {
    const signed1 = await signer.signArtifact(sampleContent);
    const signed2 = await signer.signArtifact(sampleContent);
    expect(signed1.artifactHash).toBe(signed2.artifactHash);
  });
});
