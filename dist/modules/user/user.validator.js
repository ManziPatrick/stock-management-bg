"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
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
// New schemas for admin management
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Name is required!' }),
    email: zod_1.z.string({ required_error: 'Email is required!' }).email('Invalid email format'),
    password: zod_1.z.string({ required_error: 'Password is required!' })
        .min(6, { message: 'password must have 6 characters' }),
    role: zod_1.z.enum(['ADMIN', 'USER'], {
        required_error: 'Role is required!',
        invalid_type_error: 'Role must be either ADMIN or USER'
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
    instagram: zod_1.z.string().optional()
});
const updateUserRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'USER'], {
        required_error: 'Role is required!',
        invalid_type_error: 'Role must be either ADMIN or USER'
    })
});
const updateUserStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE'], {
        required_error: 'Status is required!',
        invalid_type_error: 'Status must be either ACTIVE or INACTIVE'
    })
});
const userValidator = {
    registerSchema,
    loginSchema,
    updatedProfileSchema,
    changePasswordSchema,
    createUserSchema,
    updateUserRoleSchema,
    updateUserStatusSchema
};
exports.default = userValidator;
