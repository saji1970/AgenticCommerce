import { z } from 'zod';

export const MerchantStatusEnum = z.enum(['pending', 'active', 'suspended', 'deactivated']);
export const MerchantTierEnum = z.enum(['starter', 'business', 'enterprise']);

export const CreateMerchantSchema = z.object({
  name: z.string().min(1).max(255),
  businessName: z.string().min(1).max(255),
  email: z.string().email(),
  website: z.string().url().optional(),
  tier: MerchantTierEnum,
  webhookUrl: z.string().url().optional(),
});

export const VerifyMerchantSchema = z.object({
  merchantId: z.string().uuid(),
});

export const UpdateMerchantSettingsSchema = z.object({
  supportsCartMandate: z.boolean().optional(),
  supportsIntentMandate: z.boolean().optional(),
  supportsPaymentMandate: z.boolean().optional(),
  maxTransactionAmount: z.number().positive().optional(),
  dailyTransactionLimit: z.number().positive().optional(),
  monthlyTransactionLimit: z.number().positive().optional(),
  requiresWebhookVerification: z.boolean().optional(),
  requires2FA: z.boolean().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  enableAutoApproval: z.boolean().optional(),
  autoApprovalThreshold: z.number().min(0).optional(),
});

export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>;
export type UpdateMerchantSettingsInput = z.infer<typeof UpdateMerchantSettingsSchema>;
