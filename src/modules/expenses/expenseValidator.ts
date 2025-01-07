import { z } from 'zod';

const expenseSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  amount: z.number().positive({ message: 'Amount must be a positive number' }),
  description: z.string().min(1, { message: 'Description is required' }),
  category: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export const validateExpense = (data: unknown) => expenseSchema.safeParse(data);