/**
 * Payment Gateway Abstraction
 * All gateway adapters implement this interface.
 * Supports idempotent authorization and status reconciliation.
 */

export interface GatewayAuthorizationRequest {
  idempotencyKey: string;
  amount: number;
  currency: string;
  mandateId: string;
  merchantId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayAuthorizationResponse {
  success: boolean;
  gatewayTxId: string;
  status: 'authorized' | 'declined' | 'error';
  amount: number;
  currency: string;
  message?: string;
  declineReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface GatewayCaptureRequest {
  gatewayTxId: string;
  amount: number;
  idempotencyKey: string;
}

export interface GatewayCaptureResponse {
  success: boolean;
  gatewayTxId: string;
  status: 'captured' | 'failed';
  message?: string;
}

export interface GatewayStatusRequest {
  gatewayTxId: string;
}

export interface GatewayStatusResponse {
  gatewayTxId: string;
  status: 'authorized' | 'captured' | 'settled' | 'declined' | 'failed' | 'refunded' | 'unknown';
  amount: number;
  currency: string;
  updatedAt: string;
}

/**
 * All payment gateway adapters must implement this interface.
 */
export interface PaymentGatewayAdapter {
  readonly providerName: string;

  /** Authorize (but do not capture) a payment. Must be idempotent on idempotencyKey. */
  authorize(request: GatewayAuthorizationRequest): Promise<GatewayAuthorizationResponse>;

  /** Capture a previously authorized payment. */
  capture(request: GatewayCaptureRequest): Promise<GatewayCaptureResponse>;

  /** Query the current status of a transaction for reconciliation. */
  getStatus(request: GatewayStatusRequest): Promise<GatewayStatusResponse>;

  /** Health check. */
  isHealthy(): Promise<boolean>;
}
