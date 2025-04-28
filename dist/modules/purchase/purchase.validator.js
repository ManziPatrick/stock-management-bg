"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const createSchema = zod_1.z.object({
    seller: zod_1.z.string(),
    product: zod_1.z.string(),
    sellerName: zod_1.z.string(),
    productName: zod_1.z.string(),
    quantity: zod_1.z.number(),
    unitPrice: zod_1.z.number(),
    paid: zod_1.z.number().optional()
});
const updateSchema = zod_1.z.object({
    seller: zod_1.z.string().optional(),
    product: zod_1.z.string().optional(),
    sellerName: zod_1.z.string().optional(),
    productName: zod_1.z.string().optional(),
    quantity: zod_1.z.number().optional(),
    unitPrice: zod_1.z.number().optional(),
    paid: zod_1.z.number().optional()
});
const purchaseValidator = { createSchema, updateSchema };
exports.default = purchaseValidator;
