"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const createSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.string(),
    contactNo: zod_1.z.string()
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    contactNo: zod_1.z.string().optional()
});
const sellerValidator = { createSchema, updateSchema };
exports.default = sellerValidator;
