"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
// Flexible measurement schema that accepts either type or measurement field
const measurementSchema = zod_1.z.object({
    // Either type or measurement field must be present
    type: zod_1.z.string().optional(),
    measurement: zod_1.z.string().optional(),
    value: zod_1.z.number().min(0.1).optional(),
    unit: zod_1.z.string()
}).refine(data => {
    // Either type or measurement must be present
    return (data.type !== undefined && data.type.length > 0) ||
        (data.measurement !== undefined && data.measurement.length > 0);
}, {
    message: "Either type or measurement must be specified"
});
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, { message: 'Name is required' }),
    seller: zod_1.z.string().min(1, { message: 'Seller is required' }),
    measurement: measurementSchema.optional(),
    category: zod_1.z.string().min(1, { message: 'Category is required' }),
    brand: zod_1.z.string().optional(),
    price: zod_1.z.number().min(1, { message: 'Price must be greater than 1!' }),
    stock: zod_1.z.number().min(0, { message: 'Stock cannot be negative' }),
    description: zod_1.z.string().optional()
});
const updateSchema = createSchema.partial();
const addStockSchema = zod_1.z.object({
    seller: zod_1.z.string().min(1, { message: 'Seller is required' }),
    stock: zod_1.z.number().min(1, { message: 'Must be greater than 1!' })
});
const querySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    seller: zod_1.z.string().optional(),
    minPrice: zod_1.z.string().or(zod_1.z.number()).optional(),
    maxPrice: zod_1.z.string().or(zod_1.z.number()).optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    page: zod_1.z.string().or(zod_1.z.number()).optional(),
    limit: zod_1.z.string().or(zod_1.z.number()).optional()
});
const productValidator = {
    createSchema,
    updateSchema,
    addStockSchema,
    querySchema
};
exports.default = productValidator;
