import { IPaymentGateway, PaymentGatewayConfig } from './interfaces/IPaymentGateway';
import { StripeAdapter } from './adapters/StripeAdapter';
import { RazorpayAdapter } from './adapters/RazorpayAdapter';
import { PayPalAdapter } from './adapters/PayPalAdapter';
import { SquareAdapter } from './adapters/SquareAdapter';

export type PaymentGatewayType = 'stripe' | 'razorpay' | 'paypal' | 'square';

export class PaymentGatewayFactory {
  private static instances = new Map<string, IPaymentGateway>();

  /**
   * Create and initialize a payment gateway
   */
  static async create(
    type: PaymentGatewayType,
    config: PaymentGatewayConfig
  ): Promise<IPaymentGateway> {
    // Check if instance already exists
    const cacheKey = `${type}_${config.environment || 'default'}`;
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // Create new instance based on type
    let gateway: IPaymentGateway;

    switch (type) {
      case 'stripe':
        gateway = new StripeAdapter();
        break;

      case 'razorpay':
        gateway = new RazorpayAdapter();
        break;

      case 'paypal':
        gateway = new PayPalAdapter();
        break;

      case 'square':
        gateway = new SquareAdapter();
        break;

      default:
        throw new Error(`Unsupported payment gateway type: ${type}`);
    }

    // Initialize the gateway
    await gateway.initialize(config);

    // Cache the instance
    this.instances.set(cacheKey, gateway);

    return gateway;
  }

  /**
   * Get an already initialized gateway (throws if not initialized)
   */
  static get(type: PaymentGatewayType, environment: string = 'default'): IPaymentGateway {
    const cacheKey = `${type}_${environment}`;
    const gateway = this.instances.get(cacheKey);

    if (!gateway) {
      throw new Error(`Payment gateway ${type} (${environment}) not initialized`);
    }

    return gateway;
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get list of supported gateways
   */
  static getSupportedGateways(): PaymentGatewayType[] {
    return ['stripe', 'razorpay', 'paypal', 'square'];
  }
}
