"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const measurementSchema = zod_1.z.object({
    type: zod_1.z.enum(['weight', 'length', 'volume', 'size', 'pieces']),
    value: zod_1.z.number().min(0.1).optional(),
    unit: zod_1.z.string()
}).refine((data) => {
    const unitMappings = {
        weight: ['g', 'kg', 'lb'],
        length: ['cm', 'm', 'inch'],
        volume: ['ml', 'l', 'oz'],
        pieces: ['pc', 'dozen', 'set'],
        size: ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'XXL', 'XXXL',
            'EU_36', 'EU_37', 'EU_38', 'EU_39', 'EU_40', 'EU_41', 'EU_42',
            'EU_43', 'EU_44', 'EU_45', 'EU_46', 'EU_47']
    };
    return unitMappings[data.type].includes(data.unit) &&
        (data.type === 'size' || data.value !== undefined);
}, {
    message: "Invalid measurement configuration"
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
console.log(addStockSchema);
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
