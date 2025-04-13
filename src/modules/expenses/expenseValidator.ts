import { z } from 'zod';

// Create a zod schema for expense validation
const expenseSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title cannot exceed 100 characters'),
  
  amount: z
    .number()
    .positive('Amount must be a positive number')
    .max(1000000, 'Amount cannot exceed 1,000,000'),
  
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  
  date: z
    .string()
    .or(z.date())
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid date format'),
  
  category: z
    .enum(['FOOD', 'TRANSPORT', 'UTILITIES', 'ENTERTAINMENT', 'OTHER'])
    .optional()
    .default('OTHER'),
  
  paymentMethod: z
    .enum(['CASH', 'CHECK', 'MOMO', 'PETTY_CASH']),
  
  status: z
    .enum(['ACTIVE', 'ARCHIVED'])
    .optional()
    .default('ACTIVE')
});

// Export validation function
export const validateExpense = (data: unknown) => {
  return expenseSchema.safeParse(data);
};