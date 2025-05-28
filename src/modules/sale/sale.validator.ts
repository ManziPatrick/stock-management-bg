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

// Debit details schema for credit sales
const debitDetailsSchema = z.object({
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional().default(0),
  dueDate: datePreprocessor.optional(),
  buyerPhoneNumber: z.string().optional(),
  buyerEmail: z.string().email().optional(),
  description: z.string().optional()
}).optional();

// Payment details schema
const paymentDetailsSchema = z.object({
  accountNumber: z.string().optional(),
  transactionId: z.string().optional(),
  bankName: z.string().optional(),
  reference: z.string().optional()
}).optional();

// Product schema for create operation (productPrice not required as it comes from DB)
const productCreateSchema = z.object({
  product: z
    .string()
    .refine((str) => Types.ObjectId.isValid(str), {
      message: 'Invalid product ID format',
    }),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  SellingPrice: z.number().positive('Selling price must be positive'),
});

// Product schema for update operation (includes productPrice for validation)
const productUpdateSchema = z.object({
  product: z
    .string()
    .refine((str) => Types.ObjectId.isValid(str), {
      message: 'Invalid product ID format',
    }),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  productPrice: z.number().positive('Product price must be positive'),
  SellingPrice: z.number().positive('Selling price must be positive'),
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

// Schema for creating sales
const createSchema = z.object({
  products: z.array(productCreateSchema).min(1, 'At least one product is required'),
  buyerName: z.string().min(2, 'Buyer name must be at least 2 characters'),
  date: datePreprocessor.default(() => new Date()),
  paymentMode: z.enum(['cash', 'transfer', 'card', 'credit']).default('cash'),
  paymentDetails: paymentDetailsSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'credit']).default('pending'),
  debitDetails: debitDetailsSchema,
});

// Schema for updating a sale
const updateSchema = z.object({
  buyerName: z.string().min(2, 'Buyer name must be at least 2 characters').optional(),
  paymentMode: z.enum(['cash', 'transfer', 'card', 'credit']).optional(),
  paymentDetails: paymentDetailsSchema,
  debitDetails: debitDetailsSchema,
  products: z.array(productUpdateSchema).optional(),
}).partial();

// Status update schema
const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'credit'])
});

// Collection status update schema
const collectionUpdateSchema = z.object({
  collected: z.boolean().default(true)
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
): { success: true; data: z.infer<typeof updateSchema> } | ReturnType<typeof formatZodError> => {
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

// Validation function for status update
const validateStatusUpdate = (
  data: unknown
): { success: true; data: z.infer<typeof statusUpdateSchema> } | ReturnType<typeof formatZodError> => {
  try {
    const result = statusUpdateSchema.parse(data);
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

// Validation function for collection update
const validateCollectionUpdate = (
  data: unknown
): { success: true; data: z.infer<typeof collectionUpdateSchema> } | ReturnType<typeof formatZodError> => {
  try {
    const result = collectionUpdateSchema.parse(data);
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
  statusUpdateSchema,
  collectionUpdateSchema,
  validateCreateSales,
  validateUpdateSale,
  validateStatusUpdate,
  validateCollectionUpdate,
};

export default saleValidator;