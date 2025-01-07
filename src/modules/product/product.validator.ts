import { z } from 'zod';

const measurementSchema = z.object({
  type: z.enum(['weight', 'length', 'volume', 'size', 'pieces']),
  value: z.number().min(0.1).optional(),
  unit: z.string()
}).refine((data) => {
  const unitMappings = {
    weight: ['g', 'kg', 'lb'],
    length: ['cm', 'm', 'inch'],
    volume: ['ml', 'l', 'oz'],
    pieces: ['pc', 'dozen', 'set'],
    size: ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'XXL', 'XXXL',
           'EU_36', 'EU_37', 'EU_38', 'EU_39', 'EU_40', 'EU_41', 'EU_42', 
           'EU_43', 'EU_44', 'EU_45', 'EU_46', 'EU_47']
  };
  
  return unitMappings[data.type].includes(data.unit) && 
         (data.type === 'size' || data.value !== undefined);
}, {
  message: "Invalid measurement configuration"
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
console.log(addStockSchema);

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