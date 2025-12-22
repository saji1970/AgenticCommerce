import { createSign, createVerify, generateKeyPairSync, KeyObject } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  IntentMandate,
  CartMandate,
  SignedMandate,
  MandateVerificationResult,
  CreateIntentMandateRequest,
  CreateCartMandateRequest,
  MandateStatus,
  SignatureAlgorithm,
} from '@agentic-commerce/shared';

/**
 * AP2 Mandate Manager
 * Handles creation, signing, and verification of Intent and Cart mandates
 */
export class MandateManager {
  private privateKey: KeyObject;
  private publicKey: KeyObject;
  private algorithm: SignatureAlgorithm = 'ed25519';

  constructor(privateKey?: KeyObject, publicKey?: KeyObject) {
    if (privateKey && publicKey) {
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    } else {
      // Generate new Ed25519 key pair if not provided
      const { privateKey: pvtKey, publicKey: pubKey } = generateKeyPairSync('ed25519');
      this.privateKey = pvtKey;
      this.publicKey = pubKey;
    }
  }

  /**
   * Create and sign an Intent Mandate
   */
  createIntentMandate(request: CreateIntentMandateRequest): SignedMandate<IntentMandate> {
    const mandateId = `mandate_intent_${uuidv4()}`;
    const now = new Date().toISOString();
    const timeLimitHours = request.time_limit_hours || 24;
    const validUntil = new Date(Date.now() + timeLimitHours * 60 * 60 * 1000).toISOString();

    const intentMandate: IntentMandate = {
      mandate_id: mandateId,
      mandate_type: 'intent',
      user_id: request.user_id,
      request: request.request,
      constraints: {
        max_price: request.max_price,
        min_price: request.min_price,
        valid_until: validUntil,
        approved_merchants: request.approved_merchants,
        blocked_merchants: request.blocked_merchants,
        categories: request.categories,
      },
      created_at: now,
      status: 'active',
    };

    return this.signMandate(intentMandate);
  }

  /**
   * Create and sign a Cart Mandate
   */
  createCartMandate(request: CreateCartMandateRequest): SignedMandate<CartMandate> {
    const mandateId = `mandate_cart_${uuidv4()}`;
    const now = new Date().toISOString();

    const cartMandate: CartMandate = {
      mandate_id: mandateId,
      mandate_type: 'cart',
      user_id: request.user_id,
      intent_mandate_id: request.intent_mandate_id,
      items: request.items,
      total_price: request.total_price,
      merchant: request.merchant,
      payment_method_id: request.payment_method_id,
      shipping_address: request.shipping_address,
      created_at: now,
      status: 'active',
    };

    return this.signMandate(cartMandate);
  }

  /**
   * Sign a mandate with the private key
   */
  private signMandate<T extends IntentMandate | CartMandate>(mandate: T): SignedMandate<T> {
    // Serialize mandate to deterministic JSON (sorted keys)
    const mandateJson = this.serializeMandate(mandate);

    // Create signature
    const sign = createSign('SHA256');
    sign.update(mandateJson);
    sign.end();
    const signature = sign.sign(this.privateKey);

    // Export public key
    const publicKeyBuffer = this.publicKey.export({
      type: 'spki',
      format: 'der',
    });

    return {
      mandate,
      signature: signature.toString('base64'),
      public_key: publicKeyBuffer.toString('base64'),
      algorithm: this.algorithm,
      signed_at: new Date().toISOString(),
    };
  }

  /**
   * Verify a signed mandate
   */
  verifyMandate<T extends IntentMandate | CartMandate>(
    signedMandate: SignedMandate<T>
  ): MandateVerificationResult {
    const errors: string[] = [];

    try {
      // Serialize mandate to deterministic JSON
      const mandateJson = this.serializeMandate(signedMandate.mandate);

      // Decode public key
      const publicKeyBuffer = Buffer.from(signedMandate.public_key, 'base64');
      const publicKey = createVerify('SHA256');

      // Verify signature
      publicKey.update(mandateJson);
      publicKey.end();

      const signatureBuffer = Buffer.from(signedMandate.signature, 'base64');
      const isValid = publicKey.verify(
        {
          key: publicKeyBuffer,
          format: 'der',
          type: 'spki',
        },
        signatureBuffer
      );

      if (!isValid) {
        errors.push('Invalid signature');
      }

      // Check if mandate has expired
      if (signedMandate.mandate.mandate_type === 'intent') {
        const validUntil = new Date(signedMandate.mandate.constraints.valid_until);
        if (validUntil < new Date()) {
          errors.push('Intent Mandate has expired');
        }
      }

      return {
        is_valid: isValid && errors.length === 0,
        verified_at: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        is_valid: false,
        verified_at: new Date().toISOString(),
        errors,
      };
    }
  }

  /**
   * Validate Cart Mandate against Intent Mandate
   */
  validateCartAgainstIntent(
    cartMandate: SignedMandate<CartMandate>,
    intentMandate: SignedMandate<IntentMandate>
  ): MandateVerificationResult {
    const errors: string[] = [];

    // Verify cart mandate links to intent mandate
    if (cartMandate.mandate.intent_mandate_id !== intentMandate.mandate.mandate_id) {
      errors.push('Cart Mandate does not reference the correct Intent Mandate');
    }

    // Verify user IDs match
    if (cartMandate.mandate.user_id !== intentMandate.mandate.user_id) {
      errors.push('User ID mismatch between Cart and Intent mandates');
    }

    // Verify total price is within budget constraints
    const maxPrice = intentMandate.mandate.constraints.max_price;
    if (cartMandate.mandate.total_price > maxPrice) {
      errors.push(
        `Total price $${cartMandate.mandate.total_price} exceeds maximum budget $${maxPrice}`
      );
    }

    const minPrice = intentMandate.mandate.constraints.min_price;
    if (minPrice !== undefined && cartMandate.mandate.total_price < minPrice) {
      errors.push(
        `Total price $${cartMandate.mandate.total_price} is below minimum budget $${minPrice}`
      );
    }

    // Verify merchant is approved (if approved list exists)
    const approvedMerchants = intentMandate.mandate.constraints.approved_merchants;
    if (approvedMerchants && approvedMerchants.length > 0) {
      if (!approvedMerchants.includes(cartMandate.mandate.merchant.merchant_id)) {
        errors.push(`Merchant ${cartMandate.mandate.merchant.name} is not in approved list`);
      }
    }

    // Verify merchant is not blocked
    const blockedMerchants = intentMandate.mandate.constraints.blocked_merchants;
    if (blockedMerchants && blockedMerchants.includes(cartMandate.mandate.merchant.merchant_id)) {
      errors.push(`Merchant ${cartMandate.mandate.merchant.name} is blocked`);
    }

    // Verify intent mandate hasn't expired
    const validUntil = new Date(intentMandate.mandate.constraints.valid_until);
    if (validUntil < new Date()) {
      errors.push('Intent Mandate has expired');
    }

    return {
      is_valid: errors.length === 0,
      verified_at: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Serialize mandate to deterministic JSON string (sorted keys)
   */
  private serializeMandate<T extends IntentMandate | CartMandate>(mandate: T): string {
    return JSON.stringify(mandate, Object.keys(mandate).sort());
  }

  /**
   * Get the public key in base64 format
   */
  getPublicKey(): string {
    const publicKeyBuffer = this.publicKey.export({
      type: 'spki',
      format: 'der',
    });
    return publicKeyBuffer.toString('base64');
  }

  /**
   * Export private key (use with caution - should be stored securely)
   */
  exportPrivateKey(): string {
    const privateKeyBuffer = this.privateKey.export({
      type: 'pkcs8',
      format: 'der',
    });
    return privateKeyBuffer.toString('base64');
  }

  /**
   * Revoke a mandate by updating its status
   */
  revokeMandate<T extends IntentMandate | CartMandate>(
    signedMandate: SignedMandate<T>
  ): SignedMandate<T> {
    const revokedMandate: T = {
      ...signedMandate.mandate,
      status: 'revoked' as MandateStatus,
    };

    return this.signMandate(revokedMandate);
  }
}
