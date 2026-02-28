import axios from 'axios';
import { config } from '../config/env';

const PAYMENT_GATEWAY_URL = (config.paymentGateway?.url || 'http://localhost:3002').replace(/\/$/, '');
const VRP_BASE = `${PAYMENT_GATEWAY_URL}/api/vrp`;

/**
 * Execute payment using VRP consent token.
 * Pass the user's JWT in authHeader so the payment gateway can verify the user owns the consent.
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
): Promise<{ transaction: any; gatewayResult: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const response = await axios.post(`${VRP_BASE}/execute-with-token`, params, {
    headers,
    timeout: 30000,
  });

  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  throw new Error(response.data?.error || 'Payment gateway execution failed');
}
