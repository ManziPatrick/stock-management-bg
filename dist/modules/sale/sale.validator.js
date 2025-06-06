"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
// Preprocess date: convert string or Date to a Date object.
const datePreprocessor = zod_1.z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
        const date = new Date(arg);
        return isNaN(date.getTime()) ? undefined : date;
    }
    return arg;
}, zod_1.z.date());
// Debit details schema for credit sales
const debitDetailsSchema = zod_1.z.object({
    paidAmount: zod_1.z.number().min(0, 'Paid amount cannot be negative').optional().default(0),
    dueDate: datePreprocessor.optional(),
    buyerPhoneNumber: zod_1.z.string().optional(),
    buyerEmail: zod_1.z.string().email().optional(),
    description: zod_1.z.string().optional()
}).optional();
// Payment details schema
const paymentDetailsSchema = zod_1.z.object({
    accountNumber: zod_1.z.string().optional(),
    transactionId: zod_1.z.string().optional(),
    bankName: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional()
}).optional();
// Product schema for create operation (productPrice not required as it comes from DB)
const productCreateSchema = zod_1.z.object({
    product: zod_1.z
        .string()
        .refine((str) => mongoose_1.Types.ObjectId.isValid(str), {
        message: 'Invalid product ID format',
    }),
    quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
    SellingPrice: zod_1.z.number().positive('Selling price must be positive'),
});
// Product schema for update operation (includes productPrice for validation)
const productUpdateSchema = zod_1.z.object({
    product: zod_1.z
        .string()
        .refine((str) => mongoose_1.Types.ObjectId.isValid(str), {
        message: 'Invalid product ID format',
    }),
    productName: zod_1.z.string().min(1, 'Product name is required'),
    quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
    productPrice: zod_1.z.number().positive('Product price must be positive'),
    SellingPrice: zod_1.z.number().positive('Selling price must be positive'),
    date: datePreprocessor.optional(),
}).refine((data) => data.SellingPrice >= data.productPrice * 0.5, {
    message: 'Selling price is too low compared to product price',
    path: ['SellingPrice'],
}).transform((data) => (Object.assign(Object.assign({}, data), { totalPrice: data.quantity * data.SellingPrice })));
// Schema for creating sales
const createSchema = zod_1.z.object({
    products: zod_1.z.array(productCreateSchema).min(1, 'At least one product is required'),
    buyerName: zod_1.z.string().min(2, 'Buyer name must be at least 2 characters'),
    date: datePreprocessor.default(() => new Date()),
    paymentMode: zod_1.z.enum(['cash', 'transfer', 'card', 'credit']).default('cash'),
    paymentDetails: paymentDetailsSchema,
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'credit']).default('pending'),
    debitDetails: debitDetailsSchema,
});
// Schema for updating a sale
const updateSchema = zod_1.z.object({
    buyerName: zod_1.z.string().min(2, 'Buyer name must be at least 2 characters').optional(),
    paymentMode: zod_1.z.enum(['cash', 'transfer', 'card', 'credit']).optional(),
    paymentDetails: paymentDetailsSchema,
    debitDetails: debitDetailsSchema,
    products: zod_1.z.array(productUpdateSchema).optional(),
}).partial();
// Status update schema
const statusUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'credit'])
});
// Collection status update schema
const collectionUpdateSchema = zod_1.z.object({
    collected: zod_1.z.boolean().default(true)
});
// Error formatter
const formatZodError = (error) => {
    const errors = {};
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
const validateCreateSales = (data) => {
    try {
        const result = createSchema.parse(data);
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return formatZodError(error);
        }
        throw error;
    }
};
// Validation function for update operation
const validateUpdateSale = (data) => {
    try {
        const result = updateSchema.parse(data);
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return formatZodError(error);
        }
        throw error;
    }
};
// Validation function for status update
const validateStatusUpdate = (data) => {
    try {
        const result = statusUpdateSchema.parse(data);
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return formatZodError(error);
        }
        throw error;
    }
};
// Validation function for collection update
const validateCollectionUpdate = (data) => {
    try {
        const result = collectionUpdateSchema.parse(data);
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.default = saleValidator;
