import Stripe from 'stripe';
import {
  IPaymentGateway,
  PaymentGatewayConfig,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentIntentStatus,
  SetupIntentRequest,
  SetupIntentResponse,
  CustomerInfo,
  PaymentMethodInfo,
  RefundRequest,
  RefundResponse,
  VirtualCardRequest,
  VirtualCardResponse,
} from '../interfaces/IPaymentGateway';

export class StripeAdapter implements IPaymentGateway {
  readonly name = 'stripe';
  private stripe!: Stripe;
  private webhookSecret?: string;

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: '2023-10-16',
    });
    this.webhookSecret = config.webhookSecret;
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      customer: request.customerId,
      payment_method: request.paymentMethodId,
      description: request.description,
      metadata: request.metadata,
      capture_method: request.captureMethod,
      setup_future_usage: request.setupFutureUsage ? 'off_session' : undefined,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
    };
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: PaymentIntentStatus.CANCELLED,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
    };
  }

  async createSetupIntent(request: SetupIntentRequest): Promise<SetupIntentResponse> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: request.customerId,
      payment_method_types: request.paymentMethodTypes || ['card'],
      metadata: request.metadata,
    });

    return {
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret!,
      status: setupIntent.status,
    };
  }

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerInfo> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata,
    });

    return {
      id: customer.id,
      email: customer.email || undefined,
      name: customer.name || undefined,
      metadata: customer.metadata,
    };
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;

    return {
      id: customer.id,
      email: customer.email || undefined,
      name: customer.name || undefined,
      metadata: customer.metadata,
    };
  }

  async updateCustomer(customerId: string, data: Partial<CustomerInfo>): Promise<CustomerInfo> {
    const customer = await this.stripe.customers.update(customerId, {
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    });

    return {
      id: customer.id,
      email: customer.email || undefined,
      name: customer.name || undefined,
      metadata: customer.metadata,
    };
  }

  async getPaymentMethods(customerId: string, type: string = 'card'): Promise<PaymentMethodInfo[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: type as any,
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type as any,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      expiryMonth: pm.card?.exp_month,
      expiryYear: pm.card?.exp_year,
      metadata: pm.metadata,
    }));
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethodInfo> {
    const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return {
      id: paymentMethod.id,
      type: paymentMethod.type as any,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      expiryMonth: paymentMethod.card?.exp_month,
      expiryYear: paymentMethod.card?.exp_year,
    };
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
    return { success: true };
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    const refund = await this.stripe.refunds.create({
      payment_intent: request.paymentIntentId,
      amount: request.amount ? Math.round(request.amount * 100) : undefined,
      reason: request.reason as any,
      metadata: request.metadata,
    });

    return {
      id: refund.id,
      status: refund.status as any,
      amount: refund.amount / 100,
      currency: refund.currency.toUpperCase(),
    };
  }

  async createVirtualCard(request: VirtualCardRequest): Promise<VirtualCardResponse> {
    const card = await this.stripe.issuing.cards.create({
      cardholder: request.customerId as any,
      currency: request.currency.toLowerCase(),
      type: 'virtual',
      spending_controls: {
        spending_limits: request.spendingLimits?.map((limit) => ({
          amount: Math.round(limit.amount * 100),
          interval: limit.interval,
        })),
      },
      status: 'active',
      metadata: request.metadata,
    });

    return {
      id: card.id,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      status: card.status as any,
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  parseWebhookEvent(payload: string | Buffer): any {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Signature should be verified before calling this
    return JSON.parse(payload.toString());
  }

  private mapStripeStatus(stripeStatus: string): PaymentIntentStatus {
    const statusMap: Record<string, PaymentIntentStatus> = {
      requires_payment_method: PaymentIntentStatus.PENDING,
      requires_confirmation: PaymentIntentStatus.REQUIRES_CONFIRMATION,
      requires_action: PaymentIntentStatus.REQUIRES_ACTION,
      processing: PaymentIntentStatus.PROCESSING,
      succeeded: PaymentIntentStatus.SUCCEEDED,
      canceled: PaymentIntentStatus.CANCELLED,
      requires_capture: PaymentIntentStatus.PROCESSING,
    };

    return statusMap[stripeStatus] || PaymentIntentStatus.PENDING;
  }
}
