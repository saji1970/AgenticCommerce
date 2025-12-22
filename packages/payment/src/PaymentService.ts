import { IPaymentGateway } from './interfaces/IPaymentGateway';
import { PaymentGatewayFactory, PaymentGatewayType } from './PaymentGatewayFactory';
import type {
  PaymentIntentRequest,
  PaymentIntentResponse,
  SetupIntentRequest,
  SetupIntentResponse,
  RefundRequest,
  RefundResponse,
  CustomerInfo,
  PaymentMethodInfo,
  VirtualCardRequest,
  VirtualCardResponse,
  PaymentGatewayConfig,
} from './interfaces/IPaymentGateway';
import {
  SignedMandate,
  CartMandate,
  AP2PaymentAuthorization,
  AP2TransactionResult,
} from '@agentic-commerce/shared';

export interface PaymentServiceConfig {
  gateway: PaymentGatewayType;
  config: PaymentGatewayConfig;
}

/**
 * Main Payment Service
 * Provides a unified interface for payment operations across different gateways
 */
export class PaymentService {
  private gateway: IPaymentGateway;

  constructor(private serviceConfig: PaymentServiceConfig) {
    // Gateway will be initialized in init()
    this.gateway = null as any;
  }

  /**
   * Initialize the payment service
   */
  async init(): Promise<void> {
    this.gateway = await PaymentGatewayFactory.create(
      this.serviceConfig.gateway,
      this.serviceConfig.config
    );
  }

  /**
   * Get the gateway name
   */
  getGatewayName(): string {
    return this.gateway.name;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    return await this.gateway.createPaymentIntent(request);
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    return await this.gateway.confirmPaymentIntent(paymentIntentId);
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    return await this.gateway.cancelPaymentIntent(paymentIntentId);
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    return await this.gateway.getPaymentIntent(paymentIntentId);
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(request: SetupIntentRequest): Promise<SetupIntentResponse> {
    return await this.gateway.createSetupIntent(request);
  }

  /**
   * Create a customer
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<CustomerInfo> {
    return await this.gateway.createCustomer(email, name, metadata);
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string): Promise<CustomerInfo> {
    return await this.gateway.getCustomer(customerId);
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId: string, data: Partial<CustomerInfo>): Promise<CustomerInfo> {
    return await this.gateway.updateCustomer(customerId, data);
  }

  /**
   * Get payment methods for a customer
   */
  async getPaymentMethods(customerId: string, type?: string): Promise<PaymentMethodInfo[]> {
    return await this.gateway.getPaymentMethods(customerId, type);
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<PaymentMethodInfo> {
    return await this.gateway.attachPaymentMethod(paymentMethodId, customerId);
  }

  /**
   * Detach payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return await this.gateway.detachPaymentMethod(paymentMethodId);
  }

  /**
   * Create a refund
   */
  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    return await this.gateway.refundPayment(request);
  }

  /**
   * Create a virtual card (if supported by gateway)
   */
  async createVirtualCard(request: VirtualCardRequest): Promise<VirtualCardResponse> {
    if (!this.gateway.createVirtualCard) {
      throw new Error(`Virtual cards not supported by ${this.gateway.name}`);
    }
    return await this.gateway.createVirtualCard(request);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    return this.gateway.verifyWebhookSignature(payload, signature);
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string | Buffer): any {
    return this.gateway.parseWebhookEvent(payload);
  }

  /**
   * AP2: Process payment with Cart Mandate
   * This method handles AP2-compliant payment processing
   */
  async processAP2Payment(
    cartMandate: SignedMandate<CartMandate>,
    paymentMethodId: string
  ): Promise<AP2TransactionResult> {
    try {
      // Create payment intent with mandate metadata
      const paymentIntent = await this.createPaymentIntent({
        amount: cartMandate.mandate.total_price,
        currency: 'usd',
        customerId: cartMandate.mandate.user_id,
        paymentMethodId,
        metadata: {
          mandate_id: cartMandate.mandate.mandate_id,
          intent_mandate_id: cartMandate.mandate.intent_mandate_id,
          mandate_type: 'cart',
          merchant_id: cartMandate.mandate.merchant.merchant_id,
          merchant_name: cartMandate.mandate.merchant.name,
          ap2_enabled: 'true',
        },
      });

      // Confirm the payment
      const confirmedPayment = await this.confirmPaymentIntent(paymentIntent.id);

      // Build AP2 transaction result
      const result: AP2TransactionResult = {
        transaction_id: confirmedPayment.id,
        mandate_id: cartMandate.mandate.mandate_id,
        status:
          confirmedPayment.status === 'succeeded'
            ? 'success'
            : confirmedPayment.status === 'requires_action'
            ? 'requires_action'
            : confirmedPayment.status === 'processing'
            ? 'pending'
            : 'failed',
        amount: cartMandate.mandate.total_price,
        currency: 'USD',
        merchant: {
          merchant_id: cartMandate.mandate.merchant.merchant_id,
          name: cartMandate.mandate.merchant.name,
        },
        timestamp: new Date().toISOString(),
      };

      if (confirmedPayment.status !== 'succeeded') {
        result.error = {
          code: 'payment_failed',
          message: `Payment status: ${confirmedPayment.status}`,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        transaction_id: `failed_${Date.now()}`,
        mandate_id: cartMandate.mandate.mandate_id,
        status: 'failed',
        amount: cartMandate.mandate.total_price,
        currency: 'USD',
        merchant: {
          merchant_id: cartMandate.mandate.merchant.merchant_id,
          name: cartMandate.mandate.merchant.name,
        },
        timestamp: new Date().toISOString(),
        error: {
          code: 'payment_processing_error',
          message: errorMessage,
        },
      };
    }
  }

  /**
   * AP2: Create payment authorization from Cart Mandate
   */
  async createAP2Authorization(
    cartMandate: SignedMandate<CartMandate>,
    paymentMethodId: string
  ): Promise<AP2PaymentAuthorization> {
    // Create a payment method token for the transaction
    const paymentIntent = await this.createPaymentIntent({
      amount: cartMandate.mandate.total_price,
      currency: 'usd',
      customerId: cartMandate.mandate.user_id,
      paymentMethodId,
      captureMethod: 'manual', // Don't capture immediately
      metadata: {
        mandate_id: cartMandate.mandate.mandate_id,
        ap2_authorization: 'true',
      },
    });

    return {
      cart_mandate: cartMandate,
      payment_method_token: paymentIntent.id,
      credential_provider: this.gateway.name,
      authorization_timestamp: new Date().toISOString(),
      risk_assessment: {
        score: 0.5, // Placeholder - integrate with actual risk scoring
        factors: ['mandate_verified', 'customer_verified'],
      },
    };
  }
}

export default PaymentService;
