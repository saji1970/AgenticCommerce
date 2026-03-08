import { buildCITAuthorization, buildMITAuthorization, CITInput, MITInput } from '../iso/iso8583.builder';
import { NetworkAdapter, NetworkSimulator } from '../network';

export interface CITRequest {
  pan: string;
  amount: number;
  currency?: string;
  terminalId?: string;
  merchantId?: string;
  mandateId: string;
}

export interface CITResponse {
  success: boolean;
  transactionId: string;
  networkToken?: string;
  responseCode: string;
  errorCode?: string;
  message?: string;
}

export interface MITRequest {
  networkToken: string;
  amount: number;
  currency?: string;
  originalCitTransactionId: string;
  mandateId: string;
}

export interface MITResponse {
  success: boolean;
  transactionId: string;
  responseCode: string;
  errorCode?: string;
  message?: string;
}

export class CofPaymentService {
  private networkAdapter: NetworkAdapter;

  constructor(networkAdapter?: NetworkAdapter) {
    this.networkAdapter = networkAdapter || new NetworkSimulator();
  }

  async processCIT(request: CITRequest): Promise<CITResponse> {
    const input: CITInput = {
      pan: request.pan,
      amount: request.amount,
      currency: request.currency,
      terminalId: request.terminalId,
      merchantId: request.merchantId,
      mandateId: request.mandateId,
    };

    const isoMessage = buildCITAuthorization(input);
    console.log('[CoF-CIT] ISO8583 message built:', JSON.stringify(isoMessage.rawFields));

    const result = await this.networkAdapter.processAuthorization(isoMessage);
    console.log('[CoF-CIT] Network response:', JSON.stringify({
      approved: result.approved,
      responseCode: result.responseCode,
      transactionId: result.transactionId,
      networkTokenProvisioned: !!result.networkToken,
      errorCode: result.errorCode,
    }));

    return {
      success: result.approved,
      transactionId: result.transactionId,
      networkToken: result.networkToken,
      responseCode: result.responseCode,
      errorCode: result.errorCode,
      message: result.message,
    };
  }

  async processMIT(request: MITRequest): Promise<MITResponse> {
    const input: MITInput = {
      networkToken: request.networkToken,
      amount: request.amount,
      currency: request.currency,
      originalCitTransactionId: request.originalCitTransactionId,
      mandateId: request.mandateId,
    };

    const isoMessage = buildMITAuthorization(input);
    console.log('[CoF-MIT] ISO8583 message built:', JSON.stringify(isoMessage.rawFields));

    const result = await this.networkAdapter.processAuthorization(isoMessage);
    console.log('[CoF-MIT] Network response:', JSON.stringify({
      approved: result.approved,
      responseCode: result.responseCode,
      transactionId: result.transactionId,
      errorCode: result.errorCode,
    }));

    return {
      success: result.approved,
      transactionId: result.transactionId,
      responseCode: result.responseCode,
      errorCode: result.errorCode,
      message: result.message,
    };
  }
}
