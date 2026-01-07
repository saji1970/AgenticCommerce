import { z } from 'zod';

export const aiSearchSchema = z.object({
  query: z.string()
    .min(3, 'Query must be at least 3 characters')
    .max(500, 'Query must not exceed 500 characters'),
  filters: z.object({
    maxResults: z.number().min(1).max(50).optional(),
    priceRange: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).optional(),
    sources: z.array(z.string()).optional(),
  }).optional(),
});

export const productFiltersSchema = z.object({
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  source: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['price', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  imageUrl: z.string().url().optional(),
  productUrl: z.string().url('Invalid product URL'),
  source: z.string().max(100),
  rawData: z.any().optional(),
  aiExtracted: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  imageUrl: z.string().url().optional(),
  productUrl: z.string().url().optional(),
});

export const mcpServerConfigSchema = z.object({
  name: z.string().min(1).max(100),
  serverType: z.string().min(1).max(50),
  endpointUrl: z.string().url(),
  config: z.any(),
  isActive: z.boolean().optional(),
});

export type AISearchInput = z.infer<typeof aiSearchSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type MCPServerConfigInput = z.infer<typeof mcpServerConfigSchema>;
