import { ISO8583Message } from '../iso/iso8583.builder';

export interface NetworkAuthorizationResult {
  approved: boolean;
  responseCode: string;       // '00' = approved, '05' = declined, etc.
  transactionId: string;
  networkToken?: string;       // Returned only for CIT authorizations
  errorCode?: string;          // DECLINED | LIMIT_EXCEEDED | NETWORK_ERROR
  message?: string;
}

export interface NetworkAdapter {
  processAuthorization(message: ISO8583Message): Promise<NetworkAuthorizationResult>;
}
