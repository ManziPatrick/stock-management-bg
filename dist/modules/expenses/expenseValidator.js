"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExpense = void 0;
const zod_1 = require("zod");
// Create a zod schema for expense validation
const expenseSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(3, 'Title must be at least 3 characters long')
        .max(100, 'Title cannot exceed 100 characters'),
    amount: zod_1.z
        .number()
        .positive('Amount must be a positive number')
        .max(1000000, 'Amount cannot exceed 1,000,000'),
    description: zod_1.z
        .string()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    date: zod_1.z
        .string()
        .or(zod_1.z.date())
        .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
    }, 'Invalid date format'),
    category: zod_1.z
        .enum(['FOOD', 'TRANSPORT', 'UTILITIES', 'ENTERTAINMENT', 'OTHER'])
        .optional()
        .default('OTHER'),
    paymentMethod: zod_1.z
        .enum(['CASH', 'CHECK', 'MOMO', 'PETTY_CASH']),
    status: zod_1.z
        .enum(['ACTIVE', 'ARCHIVED'])
        .optional()
        .default('ACTIVE')
});
// Export validation function
const validateExpense = (data) => {
    return expenseSchema.safeParse(data);
};
exports.validateExpense = validateExpense;
