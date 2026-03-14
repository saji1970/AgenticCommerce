import axios from 'axios';
import { config } from '../config/env';

// Checkout execute-with-token lives on the mandate-service (moved from payment-gateway)
const MANDATE_SERVICE_URL = (config.mandateService?.url || 'http://localhost:3001/api').replace(/\/$/, '');

/**
 * Execute payment using VRP consent token via the mandate-service.
 * Pass the user's JWT in authHeader so the mandate-service can verify the user owns the consent.
 */
export async function executeWithToken(
  params: {
    consentToken: string;
    amount: number;
    currency?: string;
    description?: string;
    cartId?: string;
    intentId?: string;
    productInfo?: Record<string, any>;
  },
  authHeader?: string
): Promise<{ transactionId?: string; transaction?: any; gatewayResult?: any; [key: string]: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const response = await axios.post(`${MANDATE_SERVICE_URL}/mandates/checkout/execute-with-token`, params, {
    headers,
    timeout: 30000,
  });

  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  throw new Error(response.data?.error || 'Payment execution failed');
}
