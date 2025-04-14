"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
// Business info schema for reuse
const businessInfoSchema = zod_1.z.object({
    businessName: zod_1.z.string().optional(),
    businessAddress: zod_1.z.string().optional(),
    businessPhone: zod_1.z.string().optional()
});
// Existing schemas
const registerSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, { message: 'password must have 6 characters' })
});
const updatedProfileSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    avatar: zod_1.z.string().optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, { message: 'password must have 6 characters' })
});
const changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z
        .string({ required_error: 'Old Password is required!' })
        .min(6, { message: 'old password must have 6 characters' }),
    newPassword: zod_1.z
        .string({ required_error: 'New Password is required!' })
        .min(6, { message: 'new password must have 6 characters' })
});
// Updated schemas for admin management
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Name is required!' }),
    email: zod_1.z.string({ required_error: 'Email is required!' }).email('Invalid email format'),
    password: zod_1.z.string({ required_error: 'Password is required!' })
        .min(6, { message: 'password must have 6 characters' }),
    role: zod_1.z.enum(['SUPER_ADMIN', 'ADMIN', 'KEEPER', 'USER'], {
        required_error: 'Role is required!',
        invalid_type_error: 'Role must be valid'
    }),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    avatar: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    facebook: zod_1.z.string().optional(),
    twitter: zod_1.z.string().optional(),
    linkedin: zod_1.z.string().optional(),
    instagram: zod_1.z.string().optional(),
    businessInfo: businessInfoSchema.optional()
});
const updateUserRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'KEEPER', 'USER'], {
        required_error: 'Role is required!',
        invalid_type_error: 'Role must be valid'
    })
});
const updateUserStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE'], {
        required_error: 'Status is required!',
        invalid_type_error: 'Status must be either ACTIVE or INACTIVE'
    })
});
// New schema for creating owner/admin accounts by super admin
const createOwnerSchema = zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Name is required!' }),
    email: zod_1.z.string({ required_error: 'Email is required!' }).email('Invalid email format'),
    password: zod_1.z.string({ required_error: 'Password is required!' })
        .min(6, { message: 'password must have 6 characters' }),
    role: zod_1.z.literal('ADMIN'),
    businessInfo: zod_1.z.object({
        businessName: zod_1.z.string({ required_error: 'Business name is required!' }),
        businessAddress: zod_1.z.string({ required_error: 'Business address is required!' }),
        businessPhone: zod_1.z.string({ required_error: 'Business phone is required!' })
    })
});
const userValidator = {
    registerSchema,
    loginSchema,
    updatedProfileSchema,
    changePasswordSchema,
    createUserSchema,
    updateUserRoleSchema,
    updateUserStatusSchema,
    createOwnerSchema
};
exports.default = userValidator;
