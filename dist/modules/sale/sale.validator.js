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
// ---
// Define the raw product sale schema for update (date is required)
const baseSaleObjectSchema = zod_1.z.object({
    product: zod_1.z
        .string()
        .refine((str) => mongoose_1.Types.ObjectId.isValid(str), {
        message: 'Invalid product ID format',
    }),
    productName: zod_1.z.string().min(1, 'Product name is required'),
    quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
    productPrice: zod_1.z.number().positive('Product price must be positive'),
    SellingPrice: zod_1.z.number().positive('Selling price must be positive'),
    buyerName: zod_1.z.string().min(2, 'Buyer name must be at least 2 characters').optional(),
    date: datePreprocessor, // For updates we expect a date.
});
// Add an object-level refinement to ensure SellingPrice is at least 50% of productPrice,
// then transform to add the calculated totalPrice.
const baseSaleSchema = baseSaleObjectSchema.refine((data) => data.SellingPrice >= data.productPrice * 0.5, {
    message: 'Selling price is too low compared to product price',
    path: ['SellingPrice'],
}).transform((data) => (Object.assign(Object.assign({}, data), { totalPrice: data.quantity * data.SellingPrice })));
// ---
// For the create operation, allow the product's date to be optional.
const baseSaleCreateSchema = baseSaleObjectSchema.extend({
    date: datePreprocessor.optional(),
}).refine((data) => data.SellingPrice >= data.productPrice * 0.5, {
    message: 'Selling price is too low compared to product price',
    path: ['SellingPrice'],
}).transform((data) => (Object.assign(Object.assign({}, data), { totalPrice: data.quantity * data.SellingPrice })));
// Schema for creating multiple sales.
// Accepts common details and an array of products, where each product's date is optional.
const createSchema = zod_1.z
    .object({
    products: zod_1.z.array(baseSaleCreateSchema).min(1, 'At least one product is required'),
    buyerName: zod_1.z.string().min(2, 'Buyer name must be at least 2 characters').optional(),
    date: datePreprocessor, // common date provided at the top level (required)
})
    .transform((data) => {
    const commonDate = data.date;
    return Object.assign(Object.assign({}, data), { products: data.products.map((product) => (Object.assign(Object.assign({}, product), { date: product.date || commonDate }))) });
});
// Schema for updating a sale: use the raw object schema so that we can use .partial()
// Omit product (not updatable)
const updateSchema = baseSaleObjectSchema.partial().omit({
    product: true,
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
const saleValidator = {
    createSchema,
    updateSchema,
    validateCreateSales,
    validateUpdateSale,
};
exports.default = saleValidator;
