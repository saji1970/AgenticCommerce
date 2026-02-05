/**
 * Gateway Router
 * Routes payment requests to the appropriate gateway adapter based on configuration.
 */

import { PaymentGatewayAdapter } from './gateway.interface';
import { MockGatewayAdapter } from './mock-gateway.adapter';

export class GatewayRouter {
  private adapters = new Map<string, PaymentGatewayAdapter>();

  constructor() {
    // Register default mock adapter
    this.register(new MockGatewayAdapter());
  }

  register(adapter: PaymentGatewayAdapter): void {
    this.adapters.set(adapter.providerName, adapter);
  }

  get(providerName: string): PaymentGatewayAdapter | undefined {
    return this.adapters.get(providerName);
  }

  getDefault(): PaymentGatewayAdapter {
    return this.adapters.get('mock')!;
  }

  listProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const gatewayRouter = new GatewayRouter();
