import { z } from 'zod';
import { Types } from 'mongoose';

// Preprocess date: convert string or Date to a Date object.
const datePreprocessor = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) {
    const date = new Date(arg);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return arg;
}, z.date());

// ---
// Define the raw product sale schema for update (date is required)
const baseSaleObjectSchema = z.object({
  product: z
    .string()
    .refine((str) => Types.ObjectId.isValid(str), {
      message: 'Invalid product ID format',
    }),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  productPrice: z.number().positive('Product price must be positive'),
  SellingPrice: z.number().positive('Selling price must be positive'),
  buyerName: z.string().min(2, 'Buyer name must be at least 2 characters').optional(),
  date: datePreprocessor, // For updates we expect a date.
});

// Add an object-level refinement to ensure SellingPrice is at least 50% of productPrice,
// then transform to add the calculated totalPrice.
const baseSaleSchema = baseSaleObjectSchema.refine(
  (data) => data.SellingPrice >= data.productPrice * 0.5,
  {
    message: 'Selling price is too low compared to product price',
    path: ['SellingPrice'],
  }
).transform((data) => ({
  ...data,
  totalPrice: data.quantity * data.SellingPrice,
}));

// ---
// For the create operation, allow the product's date to be optional.
const baseSaleCreateSchema = baseSaleObjectSchema.extend({
  date: datePreprocessor.optional(),
}).refine(
  (data) => data.SellingPrice >= data.productPrice * 0.5,
  {
    message: 'Selling price is too low compared to product price',
    path: ['SellingPrice'],
  }
).transform((data) => ({
  ...data,
  totalPrice: data.quantity * data.SellingPrice,
}));

// Schema for creating multiple sales.
// Accepts common details and an array of products, where each product's date is optional.
const createSchema = z
  .object({
    products: z.array(baseSaleCreateSchema).min(1, 'At least one product is required'),
    buyerName: z.string().min(2, 'Buyer name must be at least 2 characters').optional(),
    date: datePreprocessor, // common date provided at the top level (required)
  })
  .transform((data) => {
    const commonDate = data.date;
    return {
      ...data,
      products: data.products.map((product) => ({
        ...product,
        date: product.date || commonDate,
      })),
    };
  });

// Schema for updating a sale: use the raw object schema so that we can use .partial()
// Omit product (not updatable)
const updateSchema = baseSaleObjectSchema.partial().omit({
  product: true,
});

// Error formatter
const formatZodError = (error: z.ZodError): {
  success: false;
  statusCode: number;
  message: string;
  errors: Record<string, string>;
  stack: null;
} => {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return {
    success: false,
    statusCode: 400,
    message: 'Validation Failed!',
    errors,
    stack: null,
  };
};

// Validation function for create operation
const validateCreateSales = (
  data: unknown
): { success: true; data: z.infer<typeof createSchema> } | ReturnType<typeof formatZodError> => {
  try {
    const result = createSchema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatZodError(error);
    }
    throw error;
  }
};

// Validation function for update operation
const validateUpdateSale = (
  data: unknown
): { success: true; data: Partial<z.infer<typeof baseSaleObjectSchema>> } | ReturnType<typeof formatZodError> => {
  try {
    const result = updateSchema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatZodError(error);
    }
    throw error;
  }
};

const saleValidator = {
  createSchema,
  updateSchema,
  validateCreateSales,
  validateUpdateSale,
};

export default saleValidator;
