import { z } from 'zod';

const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
  priceModifier: z.number().optional(),
});

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(1),
  productImage: z.string().url().optional(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  variants: z.array(productVariantSchema).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
  variants: z.array(productVariantSchema).optional(),
});
