import { z } from 'zod';

export const createProductReviewSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(255),
    content: z.string().max(5000),
    verifiedPurchase: z.boolean().optional(),
    images: z.array(z.string().url()).optional(),
  }),
});

export const createRetailerReviewSchema = z.object({
  body: z.object({
    retailerId: z.string().uuid(),
    storeLocationId: z.string().uuid().optional(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(255),
    content: z.string().max(5000),
    aspects: z
      .object({
        service: z.number().int().min(1).max(5).optional(),
        cleanliness: z.number().int().min(1).max(5).optional(),
        availability: z.number().int().min(1).max(5).optional(),
        pricing: z.number().int().min(1).max(5).optional(),
      })
      .optional(),
    verifiedCustomer: z.boolean().optional(),
    images: z.array(z.string().url()).optional(),
  }),
});

export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>['body'];
export type CreateRetailerReviewInput = z.infer<typeof createRetailerReviewSchema>['body'];
