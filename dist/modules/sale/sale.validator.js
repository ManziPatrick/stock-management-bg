"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const createSchema = zod_1.z.object({
    product: zod_1.z.string(),
    productName: zod_1.z.string(),
    quantity: zod_1.z.number().min(1, { message: 'Must be equal or grater than 1' }),
    productPrice: zod_1.z.number().min(1, { message: 'Must be equal or grater than 1' }),
    buyerName: zod_1.z.string(),
    date: zod_1.z.string()
});
const updateSchema = zod_1.z.object({
    product: zod_1.z.string().optional(),
    quantity: zod_1.z.number().min(1, { message: 'Must be equal or grater than 1' }).optional(),
    price: zod_1.z.number().min(1, { message: 'Must be equal or grater than 1' }).optional(),
    buyerName: zod_1.z.string().optional(),
    SellingPrice: zod_1.z.number().min(1, { message: 'selling price must nut be null' }),
    date: zod_1.z.string().optional()
});
const saleValidator = { createSchema, updateSchema };
exports.default = saleValidator;
