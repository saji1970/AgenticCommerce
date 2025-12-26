/**
 * AP2 Mandate Manager for React Native
 * Handles mandate creation, signing, and verification on mobile devices
 */

import * as Keychain from 'react-native-keychain';
import { v4 as uuidv4 } from 'uuid';
import {
  IntentMandate,
  CartMandate,
  SignedMandate,
  CreateIntentMandateRequest,
  CreateCartMandateRequest,
  MandateStatus,
} from '@agentic-commerce/shared';

interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export class AP2MandateManager {
  private userId: string;
  private keyPair: KeyPair | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the manager and load/generate key pair
   */
  async initialize(): Promise<void> {
    await this.loadOrGenerateKeyPair();
  }

  /**
   * Create and sign an Intent Mandate
   */
  async createIntentMandate(
    request: string,
    maxPrice: number,
    options?: {
      minPrice?: number;
      timeLimitHours?: number;
      approvedMerchants?: string[];
      blockedMerchants?: string[];
      categories?: string[];
    }
  ): Promise<SignedMandate<IntentMandate>> {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized. Call initialize() first.');
    }

    const mandateId = `mandate_intent_${uuidv4()}`;
    const now = new Date().toISOString();
    const timeLimitHours = options?.timeLimitHours || 24;
    const validUntil = new Date(
      Date.now() + timeLimitHours * 60 * 60 * 1000
    ).toISOString();

    const intentMandate: IntentMandate = {
      mandate_id: mandateId,
      mandate_type: 'intent',
      user_id: this.userId,
      request,
      constraints: {
        max_price: maxPrice,
        min_price: options?.minPrice,
        valid_until: validUntil,
        approved_merchants: options?.approvedMerchants,
        blocked_merchants: options?.blockedMerchants,
        categories: options?.categories,
      },
      created_at: now,
      status: 'active',
    };

    return this.signMandate(intentMandate);
  }

  /**
   * Create and sign a Cart Mandate
   */
  async createCartMandate(
    intentMandateId: string,
    items: Array<{
      product_id: string;
      name: string;
      description?: string;
      quantity: number;
      unit_price: number;
      merchant_sku?: string;
    }>,
    merchant: {
      merchant_id: string;
      name: string;
    },
    options?: {
      paymentMethodId?: string;
      shippingAddress?: any;
    }
  ): Promise<SignedMandate<CartMandate>> {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized. Call initialize() first.');
    }

    const mandateId = `mandate_cart_${uuidv4()}`;
    const now = new Date().toISOString();

    const cartItems = items.map((item) => ({
      ...item,
      total_price: item.unit_price * item.quantity,
    }));

    const totalPrice = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    const cartMandate: CartMandate = {
      mandate_id: mandateId,
      mandate_type: 'cart',
      user_id: this.userId,
      intent_mandate_id: intentMandateId,
      items: cartItems,
      total_price: totalPrice,
      merchant,
      payment_method_id: options?.paymentMethodId,
      shipping_address: options?.shippingAddress,
      created_at: now,
      status: 'active',
    };

    return this.signMandate(cartMandate);
  }

  /**
   * Sign a mandate using the private key
   * Note: In production, use biometric authentication to access the key
   */
  private async signMandate<T extends IntentMandate | CartMandate>(
    mandate: T
  ): Promise<SignedMandate<T>> {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    // Serialize mandate to deterministic JSON (sorted keys)
    const mandateJson = this.serializeMandate(mandate);

    // In React Native, we'll use a simple HMAC-based signing for now
    // In production, you should use proper Ed25519 or ECDSA signing
    // with a library like react-native-crypto or @noble/ed25519
    const signature = await this.createSignature(mandateJson, this.keyPair.privateKey);

    return {
      mandate,
      signature,
      public_key: this.keyPair.publicKey,
      algorithm: 'ed25519',
      signed_at: new Date().toISOString(),
    };
  }

  /**
   * Serialize mandate to deterministic JSON string (sorted keys)
   */
  private serializeMandate<T extends IntentMandate | CartMandate>(mandate: T): string {
    return JSON.stringify(mandate, Object.keys(mandate).sort());
  }

  /**
   * Create a signature for the mandate
   * This is a simplified version - in production use proper Ed25519 signing
   */
  private async createSignature(data: string, privateKey: string): Promise<string> {
    // This is a placeholder implementation
    // In production, use a proper crypto library like:
    // - @noble/ed25519 for Ed25519 signatures
    // - or expo-crypto for ECDSA signatures

    // For now, we'll use a simple base64 encoding of the hash
    // This is NOT secure and should be replaced with proper signing
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + privateKey);

    // Create a simple hash (in production, use crypto.subtle.sign)
    const hashBuffer = await this.simpleHash(dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Simple hash function (placeholder - use crypto.subtle in production)
   */
  private async simpleHash(buffer: Uint8Array): Promise<ArrayBuffer> {
    // In production, use:
    // return crypto.subtle.digest('SHA-256', buffer);

    // Placeholder implementation
    return buffer.buffer;
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Load existing key pair or generate a new one
   */
  private async loadOrGenerateKeyPair(): Promise<void> {
    try {
      // Try to load existing key pair from secure storage
      const privateKeyCreds = await Keychain.getInternetCredentials(`ap2_private_key_${this.userId}`);
      const publicKeyCreds = await Keychain.getInternetCredentials(`ap2_public_key_${this.userId}`);

      if (privateKeyCreds?.password && publicKeyCreds?.password) {
        this.keyPair = { privateKey: privateKeyCreds.password, publicKey: publicKeyCreds.password };
        console.log('Loaded existing AP2 key pair');
      } else {
        // Generate new key pair
        await this.generateKeyPair();
      }
    } catch (error) {
      console.error('Error loading key pair:', error);
      await this.generateKeyPair();
    }
  }

  /**
   * Generate a new Ed25519 key pair
   * In production, use a proper crypto library
   */
  private async generateKeyPair(): Promise<void> {
    // This is a placeholder - in production use:
    // - @noble/ed25519 for Ed25519 key generation
    // - expo-crypto for ECDSA key generation

    // Generate random keys (NOT secure - for demonstration only)
    const privateKey = uuidv4() + uuidv4(); // Placeholder
    const publicKey = uuidv4() + uuidv4(); // Placeholder

    // Store in secure storage
    await Keychain.setInternetCredentials(`ap2_private_key_${this.userId}`, 'privateKey', privateKey);
    await Keychain.setInternetCredentials(`ap2_public_key_${this.userId}`, 'publicKey', publicKey);

    this.keyPair = { privateKey, publicKey };
    console.log('Generated new AP2 key pair');
  }

  /**
   * Get the public key
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  /**
   * Clear keys (for logout)
   */
  async clearKeys(): Promise<void> {
    await Keychain.resetInternetCredentials(`ap2_private_key_${this.userId}`);
    await Keychain.resetInternetCredentials(`ap2_public_key_${this.userId}`);
    this.keyPair = null;
  }
}

/**
 * API Service for interacting with backend AP2 endpoints
 */
export class AP2ApiService {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Create Intent Mandate on backend
   */
  async createIntentMandate(
    signedMandate: SignedMandate<IntentMandate>
  ): Promise<SignedMandate<IntentMandate>> {
    const response = await fetch(`${this.baseUrl}/api/v1/mandates/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        request: signedMandate.mandate.request,
        max_price: signedMandate.mandate.constraints.max_price,
        min_price: signedMandate.mandate.constraints.min_price,
        time_limit_hours: 24,
        approved_merchants: signedMandate.mandate.constraints.approved_merchants,
        blocked_merchants: signedMandate.mandate.constraints.blocked_merchants,
        categories: signedMandate.mandate.constraints.categories,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create Intent Mandate');
    }

    return data.data;
  }

  /**
   * Create Cart Mandate on backend
   */
  async createCartMandate(
    signedMandate: SignedMandate<CartMandate>
  ): Promise<SignedMandate<CartMandate>> {
    const response = await fetch(`${this.baseUrl}/api/v1/mandates/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        intent_mandate_id: signedMandate.mandate.intent_mandate_id,
        items: signedMandate.mandate.items,
        total_price: signedMandate.mandate.total_price,
        merchant: signedMandate.mandate.merchant,
        payment_method_id: signedMandate.mandate.payment_method_id,
        shipping_address: signedMandate.mandate.shipping_address,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create Cart Mandate');
    }

    return data.data;
  }

  /**
   * Process payment with Cart Mandate
   */
  async processPayment(
    cartMandateId: string,
    paymentMethodId: string
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/mandates/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        cart_mandate_id: cartMandateId,
        payment_method_id: paymentMethodId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Payment processing failed');
    }

    return data.data;
  }

  /**
   * Get user's mandates
   */
  async getUserMandates(type: 'intent' | 'cart', status?: string): Promise<any[]> {
    const queryParams = new URLSearchParams({ type });
    if (status) queryParams.append('status', status);

    const response = await fetch(
      `${this.baseUrl}/api/v1/mandates/user?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch mandates');
    }

    return data.data;
  }

  /**
   * Revoke a mandate
   */
  async revokeMandate(mandateId: string, reason?: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/mandates/${mandateId}/revoke`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to revoke mandate');
    }

    return data.data;
  }
}
