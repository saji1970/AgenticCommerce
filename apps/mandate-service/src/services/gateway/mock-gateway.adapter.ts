/**
 * Mock Payment Gateway Adapter
 * Simulates a payment gateway for development and testing.
 * Supports idempotent authorization and deterministic test scenarios.
 *
 * Test behaviors:
 *   - Amount ending in .01 → decline (insufficient funds)
 *   - Amount ending in .02 → error (gateway timeout)
 *   - Amount > 99999 → decline (limit exceeded)
 *   - All other amounts → approve
 */

import crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  GatewayAuthorizationRequest,
  GatewayAuthorizationResponse,
  GatewayCaptureRequest,
  GatewayCaptureResponse,
  GatewayStatusRequest,
  GatewayStatusResponse,
} from './gateway.interface';

interface StoredTransaction {
  gatewayTxId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'settled' | 'declined' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export class MockGatewayAdapter implements PaymentGatewayAdapter {
  readonly providerName = 'mock';

  // In-memory store for idempotency and status queries
  private transactions = new Map<string, StoredTransaction>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey → gatewayTxId

  async authorize(request: GatewayAuthorizationRequest): Promise<GatewayAuthorizationResponse> {
    // Idempotency: return same result for same idempotencyKey
    const existingTxId = this.idempotencyIndex.get(request.idempotencyKey);
    if (existingTxId) {
      const existing = this.transactions.get(existingTxId)!;
      return {
        success: existing.status === 'authorized',
        gatewayTxId: existing.gatewayTxId,
        status: existing.status === 'authorized' ? 'authorized' : 'declined',
        amount: existing.amount,
        currency: existing.currency,
        message: 'Idempotent response (duplicate request)',
      };
    }

    // Simulate processing delay
    await this.simulateLatency();

    const gatewayTxId = `mock_tx_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date().toISOString();

    // Determine outcome based on amount
    const cents = Math.round(request.amount * 100) % 100;

    if (cents === 1) {
      // .01 → decline
      const tx: StoredTransaction = {
        gatewayTxId, idempotencyKey: request.idempotencyKey,
        amount: request.amount, currency: request.currency,
        status: 'declined', createdAt: now, updatedAt: now,
      };
      this.transactions.set(gatewayTxId, tx);
      this.idempotencyIndex.set(request.idempotencyKey, gatewayTxId);

      return {
        success: false, gatewayTxId, status: 'declined',
        amount: request.amount, currency: request.currency,
        declineReason: 'Insufficient funds (test scenario)',
      };
    }

    if (cents === 2) {
      // .02 → gateway error
      return {
        success: false, gatewayTxId: '', status: 'error',
        amount: request.amount, currency: request.currency,
        message: 'Gateway timeout (test scenario)',
      };
    }

    if (request.amount > 99999) {
      const tx: StoredTransaction = {
        gatewayTxId, idempotencyKey: request.idempotencyKey,
        amount: request.amount, currency: request.currency,
        status: 'declined', createdAt: now, updatedAt: now,
      };
      this.transactions.set(gatewayTxId, tx);
      this.idempotencyIndex.set(request.idempotencyKey, gatewayTxId);

      return {
        success: false, gatewayTxId, status: 'declined',
        amount: request.amount, currency: request.currency,
        declineReason: 'Amount exceeds gateway limit',
      };
    }

    // Approve
    const tx: StoredTransaction = {
      gatewayTxId, idempotencyKey: request.idempotencyKey,
      amount: request.amount, currency: request.currency,
      status: 'authorized', createdAt: now, updatedAt: now,
    };
    this.transactions.set(gatewayTxId, tx);
    this.idempotencyIndex.set(request.idempotencyKey, gatewayTxId);

    return {
      success: true, gatewayTxId, status: 'authorized',
      amount: request.amount, currency: request.currency,
      message: 'Payment authorized',
    };
  }

  async capture(request: GatewayCaptureRequest): Promise<GatewayCaptureResponse> {
    const tx = this.transactions.get(request.gatewayTxId);
    if (!tx) {
      return { success: false, gatewayTxId: request.gatewayTxId, status: 'failed', message: 'Transaction not found' };
    }
    if (tx.status !== 'authorized') {
      return { success: false, gatewayTxId: request.gatewayTxId, status: 'failed', message: `Cannot capture: status is '${tx.status}'` };
    }

    await this.simulateLatency();
    tx.status = 'captured';
    tx.updatedAt = new Date().toISOString();

    return { success: true, gatewayTxId: request.gatewayTxId, status: 'captured', message: 'Payment captured' };
  }

  async getStatus(request: GatewayStatusRequest): Promise<GatewayStatusResponse> {
    const tx = this.transactions.get(request.gatewayTxId);
    if (!tx) {
      return {
        gatewayTxId: request.gatewayTxId, status: 'unknown',
        amount: 0, currency: 'USD', updatedAt: new Date().toISOString(),
      };
    }
    return {
      gatewayTxId: tx.gatewayTxId, status: tx.status,
      amount: tx.amount, currency: tx.currency, updatedAt: tx.updatedAt,
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private simulateLatency(): Promise<void> {
    const delay = 50 + Math.random() * 150; // 50–200ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const mockGatewayAdapter = new MockGatewayAdapter();
