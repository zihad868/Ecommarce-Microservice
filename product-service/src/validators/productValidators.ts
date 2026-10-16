import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  stock: z.coerce
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .max(1000000, 'Stock exceeds maximum allowed value'),
  category: z.string().trim().min(1, 'Category is required').max(100),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).max(1000000).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit cannot exceed 100').default(10),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['price', 'createdAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const productIdParamSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
