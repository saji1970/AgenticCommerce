import { config } from '../config/env';
import { callMcpTool } from '../clients/mcp-streamable-http.client';

export const EVALUATE_PURCHASE_PAYMENT_OPTIONS = 'evaluate_purchase_payment_options';

export interface McpPaymentMethodDescriptor {
  id?: string;
  type: 'card' | 'paypal' | 'apple_pay';
  label: string;
  last4?: string;
  network?: string;
}

export interface PurchaseBasketPayload {
  items: Array<{
    productId?: string;
    productName?: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  paymentMethods?: McpPaymentMethodDescriptor[];
}

/**
 * Calls MCP tool `evaluate_purchase_payment_options` with basket fields (via Streamable HTTP).
 */
export async function evaluatePurchasePaymentOptions(
  basket: PurchaseBasketPayload
): Promise<unknown> {
  const { mcpHttp } = config;
  const { paymentMethods, ...rest } = basket;
  const toolArgs: Record<string, unknown> = {
    ...rest,
    ...(paymentMethods?.length ? { payment_methods: paymentMethods } : {}),
  };
  return callMcpTool(
    {
      baseUrl: mcpHttp.cardMCPServerURL,
      apiToken: mcpHttp.apiToken,
      protocolVersion: mcpHttp.protocolVersion,
      timeoutMs: mcpHttp.timeoutMs,
    },
    EVALUATE_PURCHASE_PAYMENT_OPTIONS,
    toolArgs
  );
}
