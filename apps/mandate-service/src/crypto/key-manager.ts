/**
 * Key Manager
 * Generates and manages Ed25519 and RSA key pairs for the mandate server.
 * The server's signing key is used to sign authorization artifacts.
 */

import crypto from 'crypto';
import { promisify } from 'util';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

export interface KeyPair {
  publicKey: string;   // PEM-encoded
  privateKey: string;  // PEM-encoded
  algorithm: 'Ed25519' | 'RSA-SHA256';
  fingerprint: string; // SHA-256 of public key
  createdAt: Date;
}

export class KeyManager {
  private serverKeyPair: KeyPair | null = null;

  /**
   * Generate an Ed25519 key pair (preferred for speed and security).
   */
  async generateEd25519KeyPair(): Promise<KeyPair> {
    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      publicKey,
      privateKey,
      algorithm: 'Ed25519',
      fingerprint: this.computeFingerprint(publicKey),
      createdAt: new Date(),
    };
  }

  /**
   * Generate an RSA-2048 key pair (for interop with legacy systems).
   */
  async generateRSAKeyPair(modulusLength = 2048): Promise<KeyPair> {
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
      modulusLength,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      publicKey,
      privateKey,
      algorithm: 'RSA-SHA256',
      fingerprint: this.computeFingerprint(publicKey),
      createdAt: new Date(),
    };
  }

  /**
   * Initialize or return the server's signing key pair.
   * In production, load from HSM or encrypted secret store.
   */
  async getServerKeyPair(): Promise<KeyPair> {
    if (!this.serverKeyPair) {
      // Check env for pre-configured key
      if (process.env.SERVER_PRIVATE_KEY_PEM && process.env.SERVER_PUBLIC_KEY_PEM) {
        this.serverKeyPair = {
          publicKey: process.env.SERVER_PUBLIC_KEY_PEM,
          privateKey: process.env.SERVER_PRIVATE_KEY_PEM,
          algorithm: (process.env.SERVER_KEY_ALGORITHM as 'Ed25519' | 'RSA-SHA256') || 'Ed25519',
          fingerprint: this.computeFingerprint(process.env.SERVER_PUBLIC_KEY_PEM),
          createdAt: new Date(),
        };
      } else {
        console.warn('[KeyManager] No server key configured. Generating ephemeral Ed25519 key pair.');
        this.serverKeyPair = await this.generateEd25519KeyPair();
      }
    }
    return this.serverKeyPair;
  }

  /**
   * SHA-256 fingerprint of a PEM public key, colon-separated hex.
   */
  computeFingerprint(publicKeyPem: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(publicKeyPem);
    const hex = hash.digest('hex').toUpperCase();
    return hex.match(/.{2}/g)!.join(':');
  }

  /**
   * Validate that a PEM string is a valid public key.
   */
  validatePublicKey(pem: string, expectedAlgorithm: 'Ed25519' | 'RSA-SHA256'): boolean {
    try {
      const keyObject = crypto.createPublicKey(pem);
      if (expectedAlgorithm === 'Ed25519') {
        return keyObject.asymmetricKeyType === 'ed25519';
      }
      return keyObject.asymmetricKeyType === 'rsa';
    } catch {
      return false;
    }
  }
}

export const keyManager = new KeyManager();
