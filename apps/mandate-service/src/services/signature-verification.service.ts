import crypto from 'crypto';
import { PublicKeyRepository } from '../repositories/public-key.repository';
import { SignatureRepository } from '../repositories/signature.repository';

/**
 * Signature Verification Service
 * Verifies digital signatures created with Secure Element keys
 */
export class SignatureVerificationService {
  private publicKeyRepository: PublicKeyRepository;
  private signatureRepository: SignatureRepository;

  constructor() {
    this.publicKeyRepository = new PublicKeyRepository();
    this.signatureRepository = new SignatureRepository();
  }

  /**
   * Verify a digital signature
   * @param signatureId The signature ID to verify
   * @returns true if signature is valid, false otherwise
   */
  async verifySignature(signatureId: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      // Get signature record
      const signature = await this.signatureRepository.getById(signatureId);
      if (!signature) {
        return { valid: false, error: 'Signature not found' };
      }

      // Get public key
      const publicKey = await this.publicKeyRepository.getById(
        signature.publicKeyId
      );
      if (!publicKey) {
        await this.signatureRepository.updateVerification(signatureId, {
          verificationStatus: 'failed',
          verificationError: 'Public key not found or revoked',
        });
        return { valid: false, error: 'Public key not found or revoked' };
      }

      // Verify signature using Node.js crypto
      try {
        const verify = crypto.createVerify('SHA256');
        verify.update(signature.mandateHash);
        verify.end();

        // Convert PEM public key to verify signature
        const isValid = verify.verify(
          publicKey.publicKeyPem,
          Buffer.from(signature.signatureData, 'base64'),
          'base64'
        );

        if (isValid) {
          // Update signature status
          await this.signatureRepository.updateVerification(signatureId, {
            verificationStatus: 'verified',
          });

          // Link signature to mandate
          await this.signatureRepository.linkToMandate(
            signature.mandateId,
            signatureId
          );

          return { valid: true };
        } else {
          await this.signatureRepository.updateVerification(signatureId, {
            verificationStatus: 'failed',
            verificationError: 'Signature verification failed',
          });
          return { valid: false, error: 'Signature verification failed' };
        }
      } catch (cryptoError: any) {
        await this.signatureRepository.updateVerification(signatureId, {
          verificationStatus: 'failed',
          verificationError: `Crypto error: ${cryptoError.message}`,
        });
        return { valid: false, error: `Crypto error: ${cryptoError.message}` };
      }
    } catch (error: any) {
      return { valid: false, error: error.message || 'Verification failed' };
    }
  }

  /**
   * Verify signature data directly (for real-time verification)
   * @param mandateHash The hash that was signed
   * @param signatureData Base64-encoded signature
   * @param publicKeyPem Public key in PEM format
   * @returns true if signature is valid
   */
  verifySignatureData(
    mandateHash: string,
    signatureData: string,
    publicKeyPem: string
  ): boolean {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(mandateHash);
      verify.end();

      return verify.verify(
        publicKeyPem,
        Buffer.from(signatureData, 'base64'),
        'base64'
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate hash for mandate text and timestamp
   * This is what gets signed by the Secure Element
   */
  generateMandateHash(mandateText: string, timestamp: string): string {
    const data = `${mandateText}|${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
