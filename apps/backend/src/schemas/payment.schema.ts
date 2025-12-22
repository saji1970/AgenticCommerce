import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().length(3, 'Currency must be 3 characters'),
    productId: z.string(),
    retailerId: z.string(),
    metadata: z.record(z.string()).optional(),
  }),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>['body'];
