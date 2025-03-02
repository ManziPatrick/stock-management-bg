import httpStatus from 'http-status';
import { z } from 'zod';
import { UserRole } from '../../constant/userRole';

// Business info schema for reuse
const businessInfoSchema = z.object({
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional()
});

// Existing schemas
const registerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6, { message: 'password must have 6 characters' })
});

const updatedProfileSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, { message: 'password must have 6 characters' })
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string({ required_error: 'Old Password is required!' })
    .min(6, { message: 'old password must have 6 characters' }),
  newPassword: z
    .string({ required_error: 'New Password is required!' })
    .min(6, { message: 'new password must have 6 characters' })
});

// Updated schemas for admin management
const createUserSchema = z.object({
  name: z.string({ required_error: 'Name is required!' }),
  email: z.string({ required_error: 'Email is required!' }).email('Invalid email format'),
  password: z.string({ required_error: 'Password is required!' })
    .min(6, { message: 'password must have 6 characters' }),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'KEEPER', 'USER'], {
    required_error: 'Role is required!',
    invalid_type_error: 'Role must be valid'
  }),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  instagram: z.string().optional(),
  businessInfo: businessInfoSchema.optional()
});

const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'KEEPER', 'USER'], {
    required_error: 'Role is required!',
    invalid_type_error: 'Role must be valid'
  })
});

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    required_error: 'Status is required!',
    invalid_type_error: 'Status must be either ACTIVE or INACTIVE'
  })
});

// New schema for creating owner/admin accounts by super admin
const createOwnerSchema = z.object({
  name: z.string({ required_error: 'Name is required!' }),
  email: z.string({ required_error: 'Email is required!' }).email('Invalid email format'),
  password: z.string({ required_error: 'Password is required!' })
    .min(6, { message: 'password must have 6 characters' }),
  role: z.literal('ADMIN'),
  businessInfo: z.object({
    businessName: z.string({ required_error: 'Business name is required!' }),
    businessAddress: z.string({ required_error: 'Business address is required!' }),
    businessPhone: z.string({ required_error: 'Business phone is required!' })
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

export default userValidator;