"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const measurementSchema = zod_1.z.object({
    type: zod_1.z.string({ required_error: 'Measurement type is required' }),
    unit: zod_1.z.string({ required_error: 'Measurement unit is required' }),
    value: zod_1.z.number({ required_error: 'Measurement value is required' })
});
const createSchema = zod_1.z.object({
    seller: zod_1.z.string(),
    product: zod_1.z.string(),
    sellerName: zod_1.z.string(),
    productName: zod_1.z.string(),
    quantity: zod_1.z.number(),
    unitPrice: zod_1.z.number(),
    paid: zod_1.z.number().optional(),
    measurement: measurementSchema
});
const updateSchema = zod_1.z.object({
    seller: zod_1.z.string().optional(),
    product: zod_1.z.string().optional(),
    sellerName: zod_1.z.string().optional(),
    productName: zod_1.z.string().optional(),
    quantity: zod_1.z.number().optional(),
    unitPrice: zod_1.z.number().optional(),
    paid: zod_1.z.number().optional(),
    measurement: measurementSchema.partial().optional()
});
const purchaseValidator = { createSchema, updateSchema };
exports.default = purchaseValidator;
