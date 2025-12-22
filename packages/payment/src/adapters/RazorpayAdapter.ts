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
} from '../interfaces/IPaymentGateway';

/**
 * Razorpay Payment Gateway Adapter
 * Popular in India and Southeast Asia
 */
export class RazorpayAdapter implements IPaymentGateway {
  readonly name = 'razorpay';
  private client: any;
  private config!: PaymentGatewayConfig;

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    this.config = config;
    // Lazy load Razorpay SDK
    const Razorpay = await import('razorpay');
    this.client = new (Razorpay as any).default({
      key_id: config.apiKey,
      key_secret: config.apiSecret,
    });
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    // Razorpay uses "orders" instead of payment intents
    const order = await this.client.orders.create({
      amount: Math.round(request.amount * 100), // Razorpay uses paise (smallest currency unit)
      currency: request.currency.toUpperCase(),
      receipt: `receipt_${Date.now()}`,
      notes: request.metadata,
    });

    return {
      id: order.id,
      clientSecret: order.id, // Razorpay uses order ID as the client reference
      status: this.mapRazorpayStatus(order.status),
      amount: order.amount / 100,
      currency: order.currency,
      metadata: order.notes,
    };
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    // In Razorpay, payment confirmation happens on the client side
    // This method fetches the payment status
    const payment = await this.client.payments.fetch(paymentIntentId);

    return {
      id: payment.id,
      status: this.mapRazorpayStatus(payment.status),
      amount: payment.amount / 100,
      currency: payment.currency,
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    // Razorpay doesn't support canceling orders, only refunds after payment
    throw new Error('Razorpay does not support canceling pending payments');
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const order = await this.client.orders.fetch(paymentIntentId);

    return {
      id: order.id,
      clientSecret: order.id,
      status: this.mapRazorpayStatus(order.status),
      amount: order.amount / 100,
      currency: order.currency,
      metadata: order.notes,
    };
  }

  async createSetupIntent(request: SetupIntentRequest): Promise<SetupIntentResponse> {
    // Razorpay handles saved payment methods differently
    // This creates a token for future payments
    throw new Error('Setup intent not directly supported by Razorpay. Use customer tokens instead.');
  }

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerInfo> {
    const customer = await this.client.customers.create({
      email,
      name,
      notes: metadata,
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.contact,
      metadata: customer.notes,
    };
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    const customer = await this.client.customers.fetch(customerId);

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.contact,
      metadata: customer.notes,
    };
  }

  async updateCustomer(customerId: string, data: Partial<CustomerInfo>): Promise<CustomerInfo> {
    const customer = await this.client.customers.edit(customerId, {
      email: data.email,
      name: data.name,
      notes: data.metadata,
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      metadata: customer.notes,
    };
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
    // Razorpay stores tokens, not payment methods
    const tokens = await this.client.customers.fetchTokens(customerId);

    return tokens.items.map((token: any) => ({
      id: token.id,
      type: 'card' as const,
      last4: token.card?.last4,
      brand: token.card?.network,
      expiryMonth: token.card?.exp_month,
      expiryYear: token.card?.exp_year,
    }));
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethodInfo> {
    // Razorpay automatically associates tokens with customers
    throw new Error('Payment method attachment handled automatically by Razorpay');
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    await this.client.tokens.delete(paymentMethodId);
    return { success: true };
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    const refund = await this.client.payments.refund(request.paymentIntentId, {
      amount: request.amount ? Math.round(request.amount * 100) : undefined,
      notes: request.metadata,
    });

    return {
      id: refund.id,
      status: refund.status === 'processed' ? 'succeeded' : 'pending',
      amount: refund.amount / 100,
      currency: 'INR', // Razorpay refunds don't return currency
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret || '')
      .update(payload.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  parseWebhookEvent(payload: string | Buffer): any {
    return JSON.parse(payload.toString());
  }

  private mapRazorpayStatus(razorpayStatus: string): PaymentIntentStatus {
    const statusMap: Record<string, PaymentIntentStatus> = {
      created: PaymentIntentStatus.PENDING,
      attempted: PaymentIntentStatus.PROCESSING,
      paid: PaymentIntentStatus.SUCCEEDED,
      authorized: PaymentIntentStatus.REQUIRES_CONFIRMATION,
      captured: PaymentIntentStatus.SUCCEEDED,
      refunded: PaymentIntentStatus.CANCELLED,
      failed: PaymentIntentStatus.FAILED,
    };

    return statusMap[razorpayStatus] || PaymentIntentStatus.PENDING;
  }
}
