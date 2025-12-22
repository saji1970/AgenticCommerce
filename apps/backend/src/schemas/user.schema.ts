import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  body: z.object({
    preferredCategories: z.array(z.string()).optional(),
    preferredRetailers: z.array(z.string()).optional(),
    excludedRetailers: z.array(z.string()).optional(),
    budgetLimits: z
      .object({
        daily: z.number().positive().optional(),
        weekly: z.number().positive().optional(),
        monthly: z.number().positive().optional(),
      })
      .optional(),
    priceAlerts: z.boolean().optional(),
    favoritesBrands: z.array(z.string()).optional(),
    shippingPreferences: z
      .object({
        maxShippingCost: z.number().positive().optional(),
        preferFreeShipping: z.boolean().optional(),
        maxDeliveryDays: z.number().int().positive().optional(),
      })
      .optional(),
  }),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>['body'];
