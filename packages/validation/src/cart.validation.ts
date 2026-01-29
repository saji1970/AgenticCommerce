import { z } from 'zod';

const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
  priceModifier: z.number().optional(),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1), // Accept any non-empty string (not just UUIDs)
  productName: z.string().min(1),
  productImage: z.preprocess(
    (val) => {
      // Convert empty string to undefined
      if (val === '' || val === null) return undefined;
      return val;
    },
    z.string().url().optional()
  ), // Allow empty string, null, or valid URL
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  variants: z.array(productVariantSchema).optional(),
  // Optional fields for agent-based cart operations
  agentId: z.string().optional(),
  agentName: z.string().optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
  variants: z.array(productVariantSchema).optional(),
});
