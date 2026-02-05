import { z } from 'zod';

export const RequestPaymentAuthorizationSchema = z.object({
  mandateId: z.string().uuid(),
  agentId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  idempotencyKey: z.string().min(1).max(128),
  callbackUrl: z.string().url().optional(),
  nonce: z.string().min(1),
  timestamp: z.number().int().positive(),
  signature: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const PaymentResultCallbackSchema = z.object({
  artifactId: z.string().uuid(),
  gatewayTxId: z.string().min(1),
  status: z.enum(['settled', 'failed']),
  gatewayResponse: z.record(z.unknown()).optional(),
  failureReason: z.string().optional(),
  signature: z.string().min(1),            // gateway signature for verification
  timestamp: z.number().int().positive(),
});

export type RequestPaymentAuthorizationInput = z.infer<typeof RequestPaymentAuthorizationSchema>;
export type PaymentResultCallbackInput = z.infer<typeof PaymentResultCallbackSchema>;
