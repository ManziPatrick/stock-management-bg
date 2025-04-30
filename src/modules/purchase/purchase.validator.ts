import { z } from 'zod';

const measurementSchema = z.object({
  type: z.string({ required_error: 'Measurement type is required' }),
  unit: z.string({ required_error: 'Measurement unit is required' }),
  value: z.number({ required_error: 'Measurement value is required' })
});

const createSchema = z.object({
  seller: z.string(),
  product: z.string(),
  sellerName: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  paid: z.number().optional(),
  measurement: measurementSchema
});

const updateSchema = z.object({
  seller: z.string().optional(),
  product: z.string().optional(),
  sellerName: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  paid: z.number().optional(),
  measurement: measurementSchema.partial().optional()
});

const purchaseValidator = { createSchema, updateSchema };
export default purchaseValidator;
