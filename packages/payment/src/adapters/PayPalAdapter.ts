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
 * PayPal Payment Gateway Adapter
 * Global payment solution
 */
export class PayPalAdapter implements IPaymentGateway {
  readonly name = 'paypal';
  private client: any;
  private config!: PaymentGatewayConfig;

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    this.config = config;
    // Lazy load PayPal SDK
    const checkoutNodeJssdk = await import('@paypal/checkout-server-sdk');

    const environment =
      config.environment === 'production'
        ? new checkoutNodeJssdk.core.LiveEnvironment(config.apiKey, config.apiSecret!)
        : new checkoutNodeJssdk.core.SandboxEnvironment(config.apiKey, config.apiSecret!);

    this.client = new checkoutNodeJssdk.core.PayPalHttpClient(environment);
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const OrdersCreateRequest = (await import('@paypal/checkout-server-sdk')).orders
      .OrdersCreateRequest;
    const createRequest = new OrdersCreateRequest();

    createRequest.prefer('return=representation');
    createRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toFixed(2),
          },
          description: request.description,
          custom_id: request.customerId,
        },
      ],
      application_context: {
        return_url: 'https://example.com/return',
        cancel_url: 'https://example.com/cancel',
      },
    });

    const response = await this.client.execute(createRequest);
    const order = response.result;

    return {
      id: order.id,
      clientSecret: order.id,
      status: this.mapPayPalStatus(order.status),
      amount: request.amount,
      currency: request.currency,
      metadata: { paypal_order_id: order.id },
    };
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const OrdersCaptureRequest = (await import('@paypal/checkout-server-sdk')).orders
      .OrdersCaptureRequest;
    const captureRequest = new OrdersCaptureRequest(paymentIntentId);
    captureRequest.requestBody({});

    const response = await this.client.execute(captureRequest);
    const order = response.result;

    return {
      id: order.id,
      status: this.mapPayPalStatus(order.status),
      amount: parseFloat(order.purchase_units[0].amount.value),
      currency: order.purchase_units[0].amount.currency_code,
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    // PayPal orders can be voided if authorized but not captured
    throw new Error('PayPal order cancellation requires authorization status');
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const OrdersGetRequest = (await import('@paypal/checkout-server-sdk')).orders.OrdersGetRequest;
    const getRequest = new OrdersGetRequest(paymentIntentId);

    const response = await this.client.execute(getRequest);
    const order = response.result;

    return {
      id: order.id,
      clientSecret: order.id,
      status: this.mapPayPalStatus(order.status),
      amount: parseFloat(order.purchase_units[0].amount.value),
      currency: order.purchase_units[0].amount.currency_code,
    };
  }

  async createSetupIntent(request: SetupIntentRequest): Promise<SetupIntentResponse> {
    // PayPal uses vault/billing agreements for recurring payments
    throw new Error('Setup intent handled differently in PayPal. Use billing agreements.');
  }

  async createCustomer(email: string, name?: string): Promise<CustomerInfo> {
    // PayPal doesn't have a direct customer API like Stripe
    // Customer info is captured during checkout
    return {
      id: `paypal_customer_${Date.now()}`,
      email,
      name,
      metadata: { note: 'PayPal customer info managed through checkout' },
    };
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    throw new Error('PayPal does not support direct customer retrieval');
  }

  async updateCustomer(customerId: string, data: Partial<CustomerInfo>): Promise<CustomerInfo> {
    throw new Error('PayPal does not support direct customer updates');
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
    // PayPal manages payment methods through user's PayPal account
    return [];
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethodInfo> {
    throw new Error('PayPal manages payment methods through user accounts');
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    throw new Error('PayPal manages payment methods through user accounts');
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    const PaymentsRefundRequest = (await import('@paypal/checkout-server-sdk')).payments
      .CapturesRefundRequest;

    // In PayPal, we refund captures, not orders
    const refundRequest = new PaymentsRefundRequest(request.paymentIntentId);

    if (request.amount) {
      refundRequest.requestBody({
        amount: {
          value: request.amount.toFixed(2),
          currency_code: 'USD', // Would need to be passed in request
        },
      });
    }

    const response = await this.client.execute(refundRequest);
    const refund = response.result;

    return {
      id: refund.id,
      status: refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
      amount: parseFloat(refund.amount.value),
      currency: refund.amount.currency_code,
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    // PayPal webhook verification is more complex and requires additional API calls
    // This is a simplified version
    return true; // Implement proper verification in production
  }

  parseWebhookEvent(payload: string | Buffer): any {
    return JSON.parse(payload.toString());
  }

  private mapPayPalStatus(paypalStatus: string): PaymentIntentStatus {
    const statusMap: Record<string, PaymentIntentStatus> = {
      CREATED: PaymentIntentStatus.PENDING,
      SAVED: PaymentIntentStatus.PENDING,
      APPROVED: PaymentIntentStatus.REQUIRES_CONFIRMATION,
      VOIDED: PaymentIntentStatus.CANCELLED,
      COMPLETED: PaymentIntentStatus.SUCCEEDED,
      PAYER_ACTION_REQUIRED: PaymentIntentStatus.REQUIRES_ACTION,
    };

    return statusMap[paypalStatus] || PaymentIntentStatus.PENDING;
  }
}
