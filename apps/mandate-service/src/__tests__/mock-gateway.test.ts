/**
 * Mock Payment Gateway Adapter Tests
 * Tests: authorization, idempotency, decline scenarios, capture.
 */

import { MockGatewayAdapter } from '../services/gateway/mock-gateway.adapter';

describe('MockGatewayAdapter', () => {
  let gateway: MockGatewayAdapter;

  beforeEach(() => {
    gateway = new MockGatewayAdapter();
  });

  describe('authorize', () => {
    it('approves normal amounts', async () => {
      const result = await gateway.authorize({
        idempotencyKey: 'test_1',
        amount: 99.99,
        currency: 'USD',
        mandateId: 'm1',
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('authorized');
      expect(result.gatewayTxId).toMatch(/^mock_tx_/);
    });

    it('declines amounts ending in .01 (insufficient funds)', async () => {
      const result = await gateway.authorize({
        idempotencyKey: 'test_decline',
        amount: 100.01,
        currency: 'USD',
        mandateId: 'm1',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('declined');
      expect(result.declineReason).toContain('Insufficient funds');
    });

    it('returns error for amounts ending in .02 (gateway timeout)', async () => {
      const result = await gateway.authorize({
        idempotencyKey: 'test_error',
        amount: 100.02,
        currency: 'USD',
        mandateId: 'm1',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
    });

    it('declines amounts over 99999', async () => {
      const result = await gateway.authorize({
        idempotencyKey: 'test_limit',
        amount: 100000,
        currency: 'USD',
        mandateId: 'm1',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('declined');
    });

    it('returns idempotent response for duplicate requests', async () => {
      const first = await gateway.authorize({
        idempotencyKey: 'idem_test',
        amount: 50.00,
        currency: 'USD',
        mandateId: 'm1',
      });
      expect(first.success).toBe(true);

      const second = await gateway.authorize({
        idempotencyKey: 'idem_test',
        amount: 50.00,
        currency: 'USD',
        mandateId: 'm1',
      });
      expect(second.success).toBe(true);
      expect(second.gatewayTxId).toBe(first.gatewayTxId);
      expect(second.message).toContain('Idempotent');
    });
  });

  describe('capture', () => {
    it('captures an authorized transaction', async () => {
      const auth = await gateway.authorize({
        idempotencyKey: 'capture_test',
        amount: 75.00,
        currency: 'USD',
        mandateId: 'm1',
      });

      const capture = await gateway.capture({
        gatewayTxId: auth.gatewayTxId,
        amount: 75.00,
        idempotencyKey: 'capture_test',
      });
      expect(capture.success).toBe(true);
      expect(capture.status).toBe('captured');
    });

    it('fails to capture unknown transaction', async () => {
      const capture = await gateway.capture({
        gatewayTxId: 'nonexistent',
        amount: 50.00,
        idempotencyKey: 'bad_capture',
      });
      expect(capture.success).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('returns status for known transaction', async () => {
      const auth = await gateway.authorize({
        idempotencyKey: 'status_test',
        amount: 25.00,
        currency: 'USD',
        mandateId: 'm1',
      });

      const status = await gateway.getStatus({ gatewayTxId: auth.gatewayTxId });
      expect(status.status).toBe('authorized');
      expect(status.amount).toBe(25.00);
    });

    it('returns unknown for nonexistent transaction', async () => {
      const status = await gateway.getStatus({ gatewayTxId: 'nope' });
      expect(status.status).toBe('unknown');
    });
  });

  describe('isHealthy', () => {
    it('returns true', async () => {
      expect(await gateway.isHealthy()).toBe(true);
    });
  });
});
