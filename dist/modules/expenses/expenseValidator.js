"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExpense = void 0;
const zod_1 = require("zod");
const expenseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, { message: 'Title is required' }),
    amount: zod_1.z.number().positive({ message: 'Amount must be a positive number' }),
    description: zod_1.z.string().min(1, { message: 'Description is required' }),
    category: zod_1.z.string().optional(),
    date: zod_1.z.string().transform((str) => new Date(str)),
    status: zod_1.z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
const validateExpense = (data) => expenseSchema.safeParse(data);
exports.validateExpense = validateExpense;
