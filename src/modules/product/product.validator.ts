import { z } from 'zod';

// Flexible measurement schema that accepts either type or measurement field
const measurementSchema = z.object({
  // Either type or measurement field must be present
  type: z.string().optional(),
  measurement: z.string().optional(),
  value: z.number().min(0.1).optional(),
  unit: z.string()
}).refine(data => {
  // Either type or measurement must be present
  return (data.type !== undefined && data.type.length > 0) || 
         (data.measurement !== undefined && data.measurement.length > 0);
}, {
  message: "Either type or measurement must be specified"
});

const createSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  seller: z.string().min(1, { message: 'Seller is required' }),
  measurement: measurementSchema.optional(),
  category: z.string().min(1, { message: 'Category is required' }),
  brand: z.string().optional(),
  price: z.number().min(1, { message: 'Price must be greater than 1!' }),
  stock: z.number().min(0, { message: 'Stock cannot be negative' }),
  description: z.string().optional()
});

const updateSchema = createSchema.partial();

const addStockSchema = z.object({
  seller: z.string().min(1, { message: 'Seller is required' }),
  stock: z.number().min(1, { message: 'Must be greater than 1!' })
});

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  seller: z.string().optional(),
  minPrice: z.string().or(z.number()).optional(),
  maxPrice: z.string().or(z.number()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().or(z.number()).optional(),
  limit: z.string().or(z.number()).optional()
});

const productValidator = {
  createSchema,
  updateSchema,
  addStockSchema,
  querySchema
};

export default productValidator;