import { z } from 'zod';

export const chatRequestSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
    sessionId: z.string().uuid().optional(),
    context: z
      .object({
        budget: z.number().positive().optional(),
        category: z.string().optional(),
        preferredRetailers: z.array(z.string()).optional(),
        urgency: z.enum(['low', 'medium', 'high']).optional(),
      })
      .optional(),
  }),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>['body'];
