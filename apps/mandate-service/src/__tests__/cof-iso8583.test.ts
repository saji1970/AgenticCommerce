/**
 * ISO8583 Builder + Network Simulator Tests
 *
 * Pure unit tests for the Payment Gateway ISO8583 message builder
 * and the network simulator. No mocks needed — these are standalone.
 */

// Import directly from the payment-gateway source
import {
  buildCITAuthorization,
  buildMITAuthorization,
  generateSTAN,
  formatDE7,
  maskPAN,
} from '../../../payment-gateway/src/iso/iso8583.builder';

import { NetworkSimulator } from '../../../payment-gateway/src/network/network-simulator';

describe('ISO8583 Builder', () => {
  describe('generateSTAN', () => {
    it('returns a 6-digit string', () => {
      const stan = generateSTAN();
      expect(stan).toHaveLength(6);
      expect(/^\d{6}$/.test(stan)).toBe(true);
    });

    it('increments on each call', () => {
      const first = generateSTAN();
      const second = generateSTAN();
      expect(parseInt(second)).toBe(parseInt(first) + 1);
    });
  });

  describe('formatDE7', () => {
    it('formats a date as MMDDHHmmss', () => {
      // 2025-03-15 14:30:45 UTC
      const date = new Date(Date.UTC(2025, 2, 15, 14, 30, 45));
      expect(formatDE7(date)).toBe('0315143045');
    });

    it('pads single-digit values', () => {
      // 2025-01-05 03:02:01 UTC
      const date = new Date(Date.UTC(2025, 0, 5, 3, 2, 1));
      expect(formatDE7(date)).toBe('0105030201');
    });
  });

  describe('maskPAN', () => {
    it('masks a 16-digit PAN correctly', () => {
      expect(maskPAN('4111111111111111')).toBe('411111******1111');
    });

    it('masks a 19-digit PAN correctly', () => {
      expect(maskPAN('4111111111111111123')).toBe('411111*********1123');
    });

    it('handles short PAN gracefully', () => {
      expect(maskPAN('12345678')).toBe('****5678');
    });
  });

  describe('buildCITAuthorization', () => {
    it('builds a valid CIT message with MTI 0100', () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 10.50,
        currency: 'USD',
        mandateId: 'mandate-123',
      });

      expect(msg.mti).toBe('0100');
      expect(msg.fields[2]).toBe('4111111111111111');
      expect(msg.fields[3]).toBe('000000');
      expect(msg.fields[4]).toBe('000000001050');
      expect(msg.fields[48]).toBe('CIT_INITIAL');
      expect(msg.fields[49]).toBe('840');
    });

    it('uses custom terminalId and merchantId', () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 1.00,
        terminalId: 'TERM99',
        merchantId: 'MERCH42',
        mandateId: 'mandate-456',
      });

      expect(msg.fields[41]).toBe('TERM99');
      expect(msg.fields[42]).toBe('MERCH42');
    });

    it('masks PAN in rawFields for logging', () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 5.00,
        mandateId: 'mandate-789',
      });

      expect(msg.rawFields.DE2_PAN).toBe('411111******1111');
      expect(msg.rawFields.MandateId).toBe('mandate-789');
      expect(msg.rawFields.DE48_CoFIndicator).toBe('CIT_INITIAL');
    });

    it('handles EUR currency', () => {
      const msg = buildCITAuthorization({
        pan: '5500000000000004',
        amount: 25.00,
        currency: 'EUR',
        mandateId: 'mandate-eur',
      });

      expect(msg.fields[49]).toBe('978');
    });

    it('rounds fractional cents properly', () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 99.999,
        mandateId: 'mandate-round',
      });

      // 99.999 * 100 = 9999.9 → rounds to 10000
      expect(msg.fields[4]).toBe('000000010000');
    });
  });

  describe('buildMITAuthorization', () => {
    it('builds a valid MIT message with MTI 0100', () => {
      const msg = buildMITAuthorization({
        networkToken: 'NTKN_ABC123',
        amount: 42.00,
        currency: 'USD',
        originalCitTransactionId: 'SIM_ORIG_001',
        mandateId: 'mandate-mit-1',
      });

      expect(msg.mti).toBe('0100');
      expect(msg.fields[2]).toBe('NTKN_ABC123');
      expect(msg.fields[4]).toBe('000000004200');
      expect(msg.fields[25]).toBe('08');
      expect(msg.fields[48]).toBe('MIT_SUBSEQUENT');
      expect(msg.fields[63]).toBe('SIM_ORIG_001');
    });

    it('masks network token in rawFields', () => {
      const msg = buildMITAuthorization({
        networkToken: 'NTKN_1234567890ABCDEF',
        amount: 10.00,
        originalCitTransactionId: 'SIM_X',
        mandateId: 'mandate-mit-2',
      });

      // maskPAN: first 6 + last 4, 21 chars → 11 asterisks
      expect(msg.rawFields.DE2_NetworkToken).toBe('NTKN_1***********CDEF');
      expect(msg.rawFields.DE48_CoFIndicator).toBe('MIT_SUBSEQUENT');
      expect(msg.rawFields.DE63_OriginalCitRef).toBe('SIM_X');
    });
  });
});

describe('NetworkSimulator', () => {
  let simulator: NetworkSimulator;

  beforeEach(() => {
    simulator = new NetworkSimulator();
  });

  describe('CIT authorization', () => {
    it('approves normal amount and returns network token', async () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 50.00,
        mandateId: 'mandate-cit',
      });

      const result = await simulator.processAuthorization(msg);

      expect(result.approved).toBe(true);
      expect(result.responseCode).toBe('00');
      expect(result.networkToken).toBeDefined();
      expect(result.networkToken).toMatch(/^NTKN_/);
      expect(result.transactionId).toMatch(/^SIM_/);
      expect(result.message).toBe('Approved');
    });

    it('declines when amount ends in .01', async () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 100.01,
        mandateId: 'mandate-decline',
      });

      const result = await simulator.processAuthorization(msg);

      expect(result.approved).toBe(false);
      expect(result.responseCode).toBe('05');
      expect(result.errorCode).toBe('DECLINED');
      expect(result.networkToken).toBeUndefined();
    });

    it('returns NETWORK_ERROR when amount ends in .02', async () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 50.02,
        mandateId: 'mandate-neterr',
      });

      const result = await simulator.processAuthorization(msg);

      expect(result.approved).toBe(false);
      expect(result.responseCode).toBe('96');
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('returns LIMIT_EXCEEDED when amount > 99999', async () => {
      const msg = buildCITAuthorization({
        pan: '4111111111111111',
        amount: 100000,
        mandateId: 'mandate-limit',
      });

      const result = await simulator.processAuthorization(msg);

      expect(result.approved).toBe(false);
      expect(result.responseCode).toBe('61');
      expect(result.errorCode).toBe('LIMIT_EXCEEDED');
    });
  });

  describe('MIT authorization', () => {
    it('approves normal amount without returning network token', async () => {
      const msg = buildMITAuthorization({
        networkToken: 'NTKN_TEST_TOKEN',
        amount: 25.00,
        originalCitTransactionId: 'SIM_ORIG',
        mandateId: 'mandate-mit',
      });

      const result = await simulator.processAuthorization(msg);

      expect(result.approved).toBe(true);
      expect(result.responseCode).toBe('00');
      expect(result.networkToken).toBeUndefined();
      expect(result.transactionId).toMatch(/^SIM_/);
    });

    it('declines MIT when amount ends in .01', async () => {
      const msg = buildMITAuthorization({
        networkToken: 'NTKN_TEST_TOKEN',
        amount: 20.01,
        originalCitTransactionId: 'SIM_ORIG',
        mandateId: 'mandate-mit-decline',
      });

      const result = await simulator.processAuthorization(msg);

      expect(result.approved).toBe(false);
      expect(result.errorCode).toBe('DECLINED');
    });
  });
});
