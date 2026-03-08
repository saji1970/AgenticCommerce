import { ISO8583Message } from '../iso/iso8583.builder';
import { NetworkAdapter, NetworkAuthorizationResult } from './network-adapter.interface';

/**
 * Simulates a card network (Visa/Mastercard) for demo and testing.
 *
 * Test scenarios (based on amount in minor units):
 *   - amount ending in .01 → DECLINED
 *   - amount ending in .02 → NETWORK_ERROR
 *   - amount > 99999       → LIMIT_EXCEEDED
 *   - everything else      → APPROVED
 *
 * CIT authorizations return a provisioned networkToken.
 * MIT authorizations do not.
 */
export class NetworkSimulator implements NetworkAdapter {
  async processAuthorization(message: ISO8583Message): Promise<NetworkAuthorizationResult> {
    // Simulate 50-200ms network latency
    const latency = 50 + Math.random() * 150;
    await new Promise(resolve => setTimeout(resolve, latency));

    const amountStr = message.fields[4] as string;
    const amountCents = parseInt(amountStr, 10);
    const amountDollars = amountCents / 100;
    const isCIT = message.fields[48] === 'CIT_INITIAL';

    const transactionId = `SIM_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Test scenario: amount ending in .01 → DECLINED
    if (amountCents % 100 === 1) {
      return {
        approved: false,
        responseCode: '05',
        transactionId,
        errorCode: 'DECLINED',
        message: 'Card declined by issuer',
      };
    }

    // Test scenario: amount ending in .02 → NETWORK_ERROR
    if (amountCents % 100 === 2) {
      return {
        approved: false,
        responseCode: '96',
        transactionId,
        errorCode: 'NETWORK_ERROR',
        message: 'Network communication error',
      };
    }

    // Test scenario: amount > 99999 → LIMIT_EXCEEDED
    if (amountDollars > 99999) {
      return {
        approved: false,
        responseCode: '61',
        transactionId,
        errorCode: 'LIMIT_EXCEEDED',
        message: 'Amount exceeds network limit',
      };
    }

    // Approved
    const result: NetworkAuthorizationResult = {
      approved: true,
      responseCode: '00',
      transactionId,
      message: 'Approved',
    };

    // CIT: provision a network token
    if (isCIT) {
      result.networkToken = `NTKN_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }

    return result;
  }
}
