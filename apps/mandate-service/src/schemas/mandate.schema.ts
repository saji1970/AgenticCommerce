import { z } from 'zod';

export const MandateTypeEnum = z.enum(['cart', 'intent', 'payment']);
export const MandateStatusEnum = z.enum([
  'draft', 'awaiting_consent', 'active', 'consumed', 'revoked', 'expired',
]);

const CartConstraintsSchema = z.object({
  maxItemsPerDay: z.number().int().positive().optional(),
  maxItemValue: z.number().positive().optional(),
  allowedCategories: z.array(z.string()).optional(),
  blockedCategories: z.array(z.string()).optional(),
  allowedMerchants: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
});

const IntentConstraintsSchema = z.object({
  maxIntentsPerDay: z.number().int().positive().optional(),
  maxIntentValue: z.number().positive().optional(),
  autoApproveUnder: z.number().positive().optional(),
  expiryHours: z.number().positive().optional(),
});

const PaymentConstraintsSchema = z.object({
  maxTransactionAmount: z.number().positive().optional(),
  dailySpendingLimit: z.number().positive().optional(),
  monthlySpendingLimit: z.number().positive().optional(),
  allowedPaymentMethods: z.array(z.string()).optional(),
  requiresTwoFactor: z.boolean().optional(),
  allowedMerchants: z.array(z.string()).optional(),
});

export const CreateMandateDraftSchema = z.object({
  userId: z.string().uuid(),
  agentId: z.string().min(1),
  merchantId: z.string().uuid().optional(),
  type: MandateTypeEnum,
  constraints: z.union([CartConstraintsSchema, IntentConstraintsSchema, PaymentConstraintsSchema]),
  maxAmount: z.number().positive().optional(),
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
  maxFrequency: z.number().int().positive().optional(),
  validUntil: z.string().datetime().optional(),
});

export const SubmitSignedMandateSchema = z.object({
  mandateId: z.string().uuid(),
  userId: z.string().uuid(),
  publicKeyId: z.string(),
  signatureData: z.string().min(1),        // base64-encoded signature
  signatureAlgorithm: z.enum(['Ed25519', 'RSA-SHA256']).default('Ed25519'),
  mandateText: z.string().min(1),          // human-readable text the user saw
  signatureImageUrl: z.string().optional(), // optional SVG drawn signature
  deviceInfo: z.record(z.unknown()).optional(),
  biometricType: z.enum(['fingerprint', 'face', 'none']).optional(),
});

export const ActivateMandateSchema = z.object({
  mandateId: z.string().uuid(),
});

export const RevokeMandateSchema = z.object({
  mandateId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const ValidateMandateForExecutionSchema = z.object({
  mandateId: z.string().uuid(),
  agentId: z.string().min(1),
  operationType: MandateTypeEnum,
  amount: z.number().positive().optional(),
  nonce: z.string().min(1),
  timestamp: z.number().int().positive(),
  signature: z.string().min(1),
});

export type CreateMandateDraftInput = z.infer<typeof CreateMandateDraftSchema>;
export type SubmitSignedMandateInput = z.infer<typeof SubmitSignedMandateSchema>;
export type ValidateMandateForExecutionInput = z.infer<typeof ValidateMandateForExecutionSchema>;
