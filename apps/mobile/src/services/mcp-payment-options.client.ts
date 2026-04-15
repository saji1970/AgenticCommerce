import axios from 'axios';
import { storageService } from './storage.service';
import type { SavedPaymentMethodDescriptor } from './savedPaymentMethods';

/** Must match `apps/mobile/src/services/payment.service.ts` base URL */
const API_URL = 'https://agenticcommerce-production.up.railway.app/api';

export interface EvaluatePaymentBasketPayload {
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
  /** Saved Profile payment methods (descriptors) so MCP can pick the best card */
  paymentMethods?: SavedPaymentMethodDescriptor[];
}

/**
 * Calls backend proxy POST /mcp/evaluate-payment-options (MCP token stays on server).
 * MCP tool: evaluate_purchase_payment_options.
 */
export async function evaluatePurchasePaymentOptions(
  basket: EvaluatePaymentBasketPayload
): Promise<unknown> {
  const token = await storageService.getToken();
  const res = await axios.post(
    `${API_URL}/mcp/evaluate-payment-options`,
    basket,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.data?.success) {
    const err = res.data?.error;
    const msg =
      typeof err === 'string'
        ? err
        : typeof err?.message === 'string'
          ? err.message
          : 'Failed to get payment options';
    throw new Error(msg);
  }
  return res.data.data;
}

/** Heuristic: extract human-readable text from MCP tool result (content blocks). */
export function formatMcpPaymentOptionSummary(result: unknown): string {
  if (result == null) return 'No recommendation returned.';
  const r = result as Record<string, unknown>;
  const content = r.content;
  if (Array.isArray(content)) {
    const texts = content
      .map((c) => (typeof (c as any)?.text === 'string' ? (c as any).text : null))
      .filter(Boolean) as string[];
    if (texts.length) return texts.join('\n\n');
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}
