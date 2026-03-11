import axios from 'axios';
import { config } from '../config/env';

const client = axios.create({
  baseURL: config.paymentGateway.url,
  timeout: 15000,
});

export interface CITAuthRequest {
  pan: string;
  amount: number;
  currency?: string;
  terminalId?: string;
  merchantId?: string;
  mandateId: string;
}

export interface CITAuthResponse {
  success: boolean;
  transactionId: string;
  networkToken?: string;
  responseCode: string;
  errorCode?: string;
  message?: string;
}

export interface MITAuthRequest {
  networkToken: string;
  amount: number;
  currency?: string;
  originalCitTransactionId: string;
  mandateId: string;
}

export interface MITAuthResponse {
  success: boolean;
  transactionId: string;
  responseCode: string;
  errorCode?: string;
  message?: string;
}

// Demo/test card PANs that bypass the real payment gateway
const DEMO_CARD_PANS = new Set([
  '4111111111111111',  // Visa test
  '4000000000000002',  // Visa test (decline)
  '5500000000000004',  // Mastercard test
  '5105105105105100',  // Mastercard test
  '378282246310005',   // Amex test
  '371449635398431',   // Amex test
  '6011111111111117',  // Discover test
  '4242424242424242',  // Stripe-style test
]);

// Decline test card — always returns decline even in demo mode
const DEMO_DECLINE_PAN = '4000000000000002';

function generateDemoTransactionId(): string {
  return `demo_cit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateDemoNetworkToken(): string {
  return `ntk_demo_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export const paymentClient = {
  async authorizeCIT(request: CITAuthRequest): Promise<CITAuthResponse> {
    // Simulate CIT for demo/test cards
    if (DEMO_CARD_PANS.has(request.pan)) {
      if (request.pan === DEMO_DECLINE_PAN) {
        return {
          success: false,
          transactionId: generateDemoTransactionId(),
          responseCode: '05',
          errorCode: 'CARD_DECLINED',
          message: 'Demo card declined (test decline card)',
        };
      }
      return {
        success: true,
        transactionId: generateDemoTransactionId(),
        networkToken: generateDemoNetworkToken(),
        responseCode: '00',
        message: 'CIT authorized (demo mode)',
      };
    }

    try {
      const { data } = await client.post<CITAuthResponse>('/payments/cit', request);
      return data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as CITAuthResponse;
      }
      return {
        success: false,
        transactionId: '',
        responseCode: '96',
        errorCode: 'NETWORK_ERROR',
        message: `Payment gateway unreachable: ${error.message}`,
      };
    }
  },

  async authorizeMIT(request: MITAuthRequest): Promise<MITAuthResponse> {
    // Simulate MIT for demo network tokens
    if (request.networkToken.startsWith('ntk_demo_')) {
      return {
        success: true,
        transactionId: `demo_mit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        responseCode: '00',
        message: 'MIT authorized (demo mode)',
      };
    }

    try {
      const { data } = await client.post<MITAuthResponse>('/payments/mit', request);
      return data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as MITAuthResponse;
      }
      return {
        success: false,
        transactionId: '',
        responseCode: '96',
        errorCode: 'NETWORK_ERROR',
        message: `Payment gateway unreachable: ${error.message}`,
      };
    }
  },
};
