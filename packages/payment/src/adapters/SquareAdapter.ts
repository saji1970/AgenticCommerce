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
 * Square Payment Gateway Adapter
 * Popular for retail and small businesses
 */
export class SquareAdapter implements IPaymentGateway {
  readonly name = 'square';
  private client: any;
  private config!: PaymentGatewayConfig;

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    this.config = config;
    const { Client, Environment } = await import('square');

    this.client = new Client({
      accessToken: config.apiKey,
      environment: config.environment === 'production' ? Environment.Production : Environment.Sandbox,
    });
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const { v4: uuidv4 } = await import('uuid');

    const response = await this.client.paymentsApi.createPayment({
      sourceId: request.paymentMethodId || 'EXTERNAL',
      idempotencyKey: uuidv4(),
      amountMoney: {
        amount: BigInt(Math.round(request.amount * 100)), // Square uses smallest currency unit
        currency: request.currency.toUpperCase(),
      },
      customerId: request.customerId,
      note: request.description,
      autocomplete: request.captureMethod !== 'manual',
    });

    const payment = response.result.payment!;

    return {
      id: payment.id!,
      clientSecret: payment.id,
      status: this.mapSquareStatus(payment.status!),
      amount: Number(payment.amountMoney!.amount) / 100,
      currency: payment.amountMoney!.currency!,
    };
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    // Square payments are auto-completed unless autocomplete is false
    const response = await this.client.paymentsApi.completePayment(paymentIntentId);
    const payment = response.result.payment!;

    return {
      id: payment.id!,
      status: this.mapSquareStatus(payment.status!),
      amount: Number(payment.amountMoney!.amount) / 100,
      currency: payment.amountMoney!.currency!,
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const response = await this.client.paymentsApi.cancelPayment(paymentIntentId);
    const payment = response.result.payment!;

    return {
      id: payment.id!,
      status: PaymentIntentStatus.CANCELLED,
      amount: Number(payment.amountMoney!.amount) / 100,
      currency: payment.amountMoney!.currency!,
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const response = await this.client.paymentsApi.getPayment(paymentIntentId);
    const payment = response.result.payment!;

    return {
      id: payment.id!,
      clientSecret: payment.id,
      status: this.mapSquareStatus(payment.status!),
      amount: Number(payment.amountMoney!.amount) / 100,
      currency: payment.amountMoney!.currency!,
    };
  }

  async createSetupIntent(request: SetupIntentRequest): Promise<SetupIntentResponse> {
    // Square uses cards on file instead of setup intents
    throw new Error('Square uses cards on file. Save card using createCard API.');
  }

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerInfo> {
    const response = await this.client.customersApi.createCustomer({
      emailAddress: email,
      givenName: name?.split(' ')[0],
      familyName: name?.split(' ').slice(1).join(' '),
      note: JSON.stringify(metadata || {}),
    });

    const customer = response.result.customer!;

    return {
      id: customer.id!,
      email: customer.emailAddress,
      name: `${customer.givenName || ''} ${customer.familyName || ''}`.trim(),
      phone: customer.phoneNumber,
      metadata: customer.note ? JSON.parse(customer.note) : undefined,
    };
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    const response = await this.client.customersApi.retrieveCustomer(customerId);
    const customer = response.result.customer!;

    return {
      id: customer.id!,
      email: customer.emailAddress,
      name: `${customer.givenName || ''} ${customer.familyName || ''}`.trim(),
      phone: customer.phoneNumber,
      metadata: customer.note ? JSON.parse(customer.note) : undefined,
    };
  }

  async updateCustomer(customerId: string, data: Partial<CustomerInfo>): Promise<CustomerInfo> {
    const nameParts = data.name?.split(' ') || [];

    const response = await this.client.customersApi.updateCustomer(customerId, {
      emailAddress: data.email,
      givenName: nameParts[0],
      familyName: nameParts.slice(1).join(' '),
      note: data.metadata ? JSON.stringify(data.metadata) : undefined,
    });

    const customer = response.result.customer!;

    return {
      id: customer.id!,
      email: customer.emailAddress,
      name: `${customer.givenName || ''} ${customer.familyName || ''}`.trim(),
      metadata: customer.note ? JSON.parse(customer.note) : undefined,
    };
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
    const response = await this.client.cardsApi.listCards(undefined, customerId);
    const cards = response.result.cards || [];

    return cards.map((card: any) => ({
      id: card.id,
      type: 'card' as const,
      last4: card.last4,
      brand: card.cardBrand,
      expiryMonth: card.expMonth,
      expiryYear: card.expYear,
      holderName: card.cardholderName,
    }));
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethodInfo> {
    // Square cards are already associated with customer when created
    throw new Error('Square cards are associated with customer during creation');
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    await this.client.cardsApi.disableCard(paymentMethodId);
    return { success: true };
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    const { v4: uuidv4 } = await import('uuid');

    const response = await this.client.refundsApi.refundPayment({
      idempotencyKey: uuidv4(),
      paymentId: request.paymentIntentId,
      amountMoney: request.amount
        ? {
            amount: BigInt(Math.round(request.amount * 100)),
            currency: 'USD', // Would need to be passed
          }
        : undefined,
      reason: request.reason,
    });

    const refund = response.result.refund!;

    return {
      id: refund.id!,
      status: refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
      amount: Number(refund.amountMoney!.amount) / 100,
      currency: refund.amountMoney!.currency!,
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.config.webhookSecret || '');
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64');

    return expectedSignature === signature;
  }

  parseWebhookEvent(payload: string | Buffer): any {
    return JSON.parse(payload.toString());
  }

  private mapSquareStatus(squareStatus: string): PaymentIntentStatus {
    const statusMap: Record<string, PaymentIntentStatus> = {
      APPROVED: PaymentIntentStatus.PROCESSING,
      PENDING: PaymentIntentStatus.PENDING,
      COMPLETED: PaymentIntentStatus.SUCCEEDED,
      CANCELED: PaymentIntentStatus.CANCELLED,
      FAILED: PaymentIntentStatus.FAILED,
    };

    return statusMap[squareStatus] || PaymentIntentStatus.PENDING;
  }
}
