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

export const paymentClient = {
  async authorizeCIT(request: CITAuthRequest): Promise<CITAuthResponse> {
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
