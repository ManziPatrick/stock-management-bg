"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const createSchema = zod_1.z.object({
    name: zod_1.z.string()
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().optional()
});
const brandValidator = { createSchema, updateSchema };
exports.default = brandValidator;
